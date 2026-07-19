import logging
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from src.data.loader import load_measures
from src.data.cleaner import clean_dataset
from src.features.preprocessor import preprocess_dataset
from src.models.mnf import detect_night_flows
from src.models.valve_inconsistency import detect_valve_inconsistency
from src.models.isolation_forest import train_isolation_forest, predict_isolation_forest
from src.models.forecaster import train_daily_forecaster, forecast_consumption, detect_consumption_deviation

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("FastAPI")

app = FastAPI(
    title="Droppy AI Microservice",
    description="Microservice de détection intelligente de fuites d'eau par IA et règles métiers.",
    version="1.0.0"
)

# -----------------
# Models & Schemas
# -----------------

class AnomalyResponse(BaseModel):
    type: str
    score: float
    start: str
    end: str
    severity: str

class PredictResponse(BaseModel):
    mac: str
    anomalies: list[AnomalyResponse]

class ForecastItem(BaseModel):
    date: str
    predicted_consumption: float
    lower_bound: float
    upper_bound: float

# -----------------
# API Endpoints
# -----------------

@app.get("/health")
def health_check():
    """
    US-05: Basic health endpoint
    """
    return {"status": "ok"}

@app.post("/train/{mac}")
def train_models(mac: str):
    """
    US-09: Endpoint to train/re-train models for a specific MAC.
    Gets historical data from DB/CSV and serializes models using joblib.
    """
    logger.info(f"Triggered model training for MAC={mac}")
    try:
        # Load historical data (up to last 30 days, or fallback CSV mock)
        df_raw = load_measures(mac=mac)
        
        if df_raw.empty:
            raise HTTPException(status_code=404, detail=f"No measures found for MAC={mac} to train models.")
            
        # Clean and preprocess
        df_cleaned = clean_dataset(df_raw)
        df_prep, _ = preprocess_dataset(df_cleaned)
        
        # Train Isolation Forest
        iforest_path = train_isolation_forest(df_prep, mac)
        
        # Train daily consumption forecaster
        forecaster_path = train_daily_forecaster(df_cleaned, mac)
        
        return {
            "status": "success",
            "message": f"Models successfully trained for MAC {mac}",
            "models": {
                "isolation_forest": iforest_path,
                "forecaster": forecaster_path if forecaster_path else "Not enough data"
            }
        }
    except Exception as e:
        logger.error(f"Error during model training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/{mac}", response_model=PredictResponse)
def predict_anomalies(
    mac: str,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to")
):
    """
    US-11: Aggregated anomaly prediction endpoint.
    Aggregates results from:
    1. Minimum Night Flow (rule-based)
    2. Valve Inconsistency (rule-based)
    3. Isolation Forest (machine learning)
    4. Daily Consumption Deviation (forecasting drift)
    """
    logger.info(f"Triggered prediction for MAC={mac} from={from_date} to={to_date}")
    try:
        # Load measures for timeframe
        df_raw = load_measures(mac=mac, start=from_date, end=to_date)
        
        if df_raw.empty:
            return {"mac": mac, "anomalies": []}
            
        # Clean and preprocess
        df_cleaned = clean_dataset(df_raw)
        df_prep, _ = preprocess_dataset(df_cleaned)
        
        # 1. Minimum Night Flow
        mnf_anomalies = detect_night_flows(df_prep)
        
        # 2. Valve Inconsistency
        valve_anomalies = detect_valve_inconsistency(df_prep)
        
        # 3. Isolation Forest (ML)
        iforest_anomalies = predict_isolation_forest(df_prep, mac)
        
        # 4. Consumption Drift (Forecasting)
        drift_anomalies = detect_consumption_deviation(df_cleaned, mac)
        
        # Combine all anomalies
        all_anomalies = mnf_anomalies + valve_anomalies + iforest_anomalies + drift_anomalies
        
        # Deduplicate anomaly events that span identical intervals and types
        unique_anomalies = []
        seen = set()
        for a in all_anomalies:
            key = (a["type"], a["start"], a["end"])
            if key not in seen:
                seen.add(key)
                unique_anomalies.append(a)
                
        return {"mac": mac, "anomalies": unique_anomalies}
    except Exception as e:
        logger.error(f"Error during anomaly prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/forecast/{mac}", response_model=list[ForecastItem])
def get_forecast(mac: str, days: int = Query(7, ge=1, le=30)):
    """
    US-12: Consumption forecast endpoint.
    Returns forecasted consumption with lower/upper bound intervals.
    """
    logger.info(f"Triggered consumption forecast for MAC={mac} (days={days})")
    try:
        forecasts = forecast_consumption(mac, days=days)
        if not forecasts:
            raise HTTPException(
                status_code=404, 
                detail=f"Forecaster model not found for MAC={mac}. Please run /train/ first."
            )
        return forecasts
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error during consumption forecasting: {e}")
        raise HTTPException(status_code=500, detail=str(e))
