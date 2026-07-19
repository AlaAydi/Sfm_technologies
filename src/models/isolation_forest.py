import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from pathlib import Path

logger = logging.getLogger(__name__)

# Directory where models are serialized
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

def get_model_path(mac: str) -> Path:
    cleaned_mac = mac.replace(":", "_").replace("-", "_")
    return MODEL_DIR / f"isolation_forest_{cleaned_mac}.joblib"

def train_isolation_forest(df: pd.DataFrame, mac: str) -> str:
    """
    US-09: Trains an Isolation Forest model on flow_rate.
    Expects preprocessed data (at least flow_rate column).
    Serializes the model using joblib.
    """
    if df.empty or "flow_rate" not in df.columns:
        raise ValueError("DataFrame is empty or missing 'flow_rate' column.")
        
    logger.info(f"Training Isolation Forest model for MAC={mac} on {len(df)} rows")
    
    # Reshape for scikit-learn X: (n_samples, n_features)
    X = df[["flow_rate"]].values
    
    # Train Isolation Forest
    # contamination='auto' or 0.05
    model = IsolationForest(n_estimators=100, contamination=0.02, random_state=42)
    model.fit(X)
    
    # Save model
    model_path = get_model_path(mac)
    joblib.dump(model, model_path)
    logger.info(f"Model successfully saved to {model_path}")
    
    return str(model_path)

def predict_isolation_forest(df: pd.DataFrame, mac: str) -> list[dict]:
    """
    US-09: Loads the Isolation Forest model for MAC and predicts flow anomalies.
    Returns a list of detected anomaly periods where decision function indicates outliers.
    """
    anomalies = []
    model_path = get_model_path(mac)
    
    if not os.path.exists(model_path):
        logger.warning(f"No Isolation Forest model found for MAC={mac}. Please train the model first.")
        return anomalies
        
    if df.empty or "flow_rate" not in df.columns or "measure_date" not in df.columns:
        return anomalies
        
    df = df.copy()
    df["measure_date"] = pd.to_datetime(df["measure_date"])
    df = df.sort_values("measure_date")
    
    # Load model
    model = joblib.load(model_path)
    X = df[["flow_rate"]].values
    
    # Predict (-1: outlier, 1: inlier)
    predictions = model.predict(X)
    # Decision function (negative for outliers, positive for inliers)
    scores = model.decision_function(X)
    
    # Normalize score between 0 and 1 (where 1 is highly anomalous, 0 is normal)
    # decision_function typically lies in [-0.5, 0.5]
    # We map positive scores to low anomaly scores (near 0), and negative scores to high (near 1)
    normalized_scores = np.clip(-scores * 2.0, 0.0, 1.0)
    
    df["is_anomaly"] = predictions == -1
    df["anomaly_score"] = normalized_scores
    
    # Filter anomalies
    anomaly_df = df[df["is_anomaly"]]
    
    if anomaly_df.empty:
        return anomalies
        
    # Group consecutive anomalies (gap <= 10 min) into single events
    time_diffs = anomaly_df["measure_date"].diff()
    new_event_mask = time_diffs > pd.Timedelta(minutes=10)
    event_ids = new_event_mask.cumsum()
    
    for event_id, group in anomaly_df.groupby(event_ids):
        start_time = group["measure_date"].min()
        end_time = group["measure_date"].max()
        max_score = group["anomaly_score"].max()
        
        # Determine severity based on score
        severity = "HIGH" if max_score > 0.8 else "MEDIUM"
        
        anomalies.append({
            "type": "FLOW_ANOMALY_IFOREST",
            "score": float(round(max_score, 2)),
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "severity": severity
        })
        
    logger.info(f"Isolation Forest detector found {len(anomalies)} anomaly events.")
    return anomalies
