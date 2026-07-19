import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory to save forecaster models
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

def get_forecaster_path(mac: str) -> Path:
    cleaned_mac = mac.replace(":", "_").replace("-", "_")
    return MODEL_DIR / f"forecaster_{cleaned_mac}.joblib"

def prepare_daily_consumption(df: pd.DataFrame) -> pd.DataFrame:
    """
    Groups data by day and computes the daily consumption from cumulative consumption.
    """
    df = df.copy()
    df["measure_date"] = pd.to_datetime(df["measure_date"])
    df["date"] = df["measure_date"].dt.date
    
    # Get max cumulative consumption per day
    daily_max = df.groupby("date")["consumption"].max().reset_index()
    daily_max = daily_max.sort_values("date")
    
    # Calculate daily consumption as difference from previous day
    daily_max["daily_consumption"] = daily_max["consumption"].diff()
    
    # Drop first row because it will be NaN after diff
    daily_max = daily_max.dropna()
    return daily_max

def train_daily_forecaster(df: pd.DataFrame, mac: str) -> str:
    """
    US-12: Trains a daily consumption forecaster.
    Uses lag features (lag_1, lag_7) to capture weekly patterns.
    """
    daily_df = prepare_daily_consumption(df)
    
    if len(daily_df) < 10:
        logger.warning("Not enough daily data to train forecaster. Need at least 10 days.")
        return ""
        
    # Feature engineering: Lags
    daily_df["lag_1"] = daily_df["daily_consumption"].shift(1)
    daily_df["lag_7"] = daily_df["daily_consumption"].shift(7)
    
    # Drop rows with NaNs in features
    train_data = daily_df.dropna().copy()
    
    if len(train_data) < 3:
        logger.warning("Not enough data left after lag features.")
        return ""
        
    X = train_data[["lag_1", "lag_7"]].values
    y = train_data["daily_consumption"].values
    
    model = Ridge()
    model.fit(X, y)
    
    # Calculate residuals standard deviation for confidence interval
    predictions = model.predict(X)
    residuals = y - predictions
    residual_std = np.std(residuals)
    
    # Save model and parameters
    model_data = {
        "model": model,
        "residual_std": float(residual_std),
        "last_known_consumptions": list(daily_df["daily_consumption"].values[-10:])
    }
    
    model_path = get_forecaster_path(mac)
    joblib.dump(model_data, model_path)
    logger.info(f"Forecaster saved for MAC={mac} at {model_path}")
    return str(model_path)

def forecast_consumption(mac: str, days: int = 7) -> list[dict]:
    """
    US-12: Generates consumption forecast for the next N days.
    Returns:
    List of dicts: [
        {
            'date': str (YYYY-MM-DD),
            'predicted_consumption': float,
            'lower_bound': float,
            'upper_bound': float
        }
    ]
    """
    forecasts = []
    model_path = get_forecaster_path(mac)
    
    if not os.path.exists(model_path):
        logger.warning(f"No forecaster model found for MAC={mac}.")
        return forecasts
        
    model_data = joblib.load(model_path)
    model = model_data["model"]
    residual_std = model_data["residual_std"]
    history = list(model_data["last_known_consumptions"])
    
    # Run autoregressive forecast for future days
    current_date = pd.Timestamp.now().normalize()
    
    for i in range(1, days + 1):
        future_date = current_date + pd.Timedelta(days=i)
        
        # Lag 1 and Lag 7
        lag_1 = history[-1]
        lag_7 = history[-7] if len(history) >= 7 else np.mean(history)
        
        pred = model.predict([[lag_1, lag_7]])[0]
        # Ensure non-negative consumption
        pred = max(0.0, float(pred))
        
        # Confidence interval: 95% interval
        upper = pred + 1.96 * residual_std
        lower = max(0.0, pred - 1.96 * residual_std)
        
        forecasts.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "predicted_consumption": round(pred, 3),
            "lower_bound": round(lower, 3),
            "upper_bound": round(upper, 3)
        })
        
        # Update history with predicted value for the next iterations
        history.append(pred)
        
    return forecasts

def detect_consumption_deviation(df: pd.DataFrame, mac: str) -> list[dict]:
    """
    US-12: Detects anomalies if actual daily consumption > upper_bound * 1.5.
    """
    anomalies = []
    model_path = get_forecaster_path(mac)
    
    if not os.path.exists(model_path):
        return anomalies
        
    model_data = joblib.load(model_path)
    model = model_data["model"]
    residual_std = model_data["residual_std"]
    
    daily_df = prepare_daily_consumption(df)
    if len(daily_df) < 8:
        return anomalies
        
    # Feature engineering for prediction
    daily_df["lag_1"] = daily_df["daily_consumption"].shift(1)
    daily_df["lag_7"] = daily_df["daily_consumption"].shift(7)
    
    eval_df = daily_df.dropna().copy()
    if eval_df.empty:
        return anomalies
        
    X = eval_df[["lag_1", "lag_7"]].values
    eval_df["predicted"] = model.predict(X)
    eval_df["upper_bound"] = eval_df["predicted"] + 1.96 * residual_std
    
    # Anomaly condition: actual > upper_bound * 1.5
    eval_df["is_deviation"] = eval_df["daily_consumption"] > (eval_df["upper_bound"] * 1.5)
    
    deviations = eval_df[eval_df["is_deviation"]]
    for idx, row in deviations.iterrows():
        anomalies.append({
            "type": "CONSUMPTION_DRIFT",
            "score": float(round(min(1.0, row["daily_consumption"] / (row["upper_bound"] * 1.5 + 0.1)), 2)),
            "start": row["date"].isoformat(),
            "end": row["date"].isoformat(),
            "severity": "HIGH"
        })
        
    return anomalies
