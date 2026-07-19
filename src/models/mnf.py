import logging
import pandas as pd
from src.config import NIGHT_START_HOUR, NIGHT_END_HOUR

logger = logging.getLogger(__name__)

def detect_night_flows(
    df: pd.DataFrame, 
    flow_threshold: float = 0.1, 
    start_hour: int = NIGHT_START_HOUR, 
    end_hour: int = NIGHT_END_HOUR
) -> list[dict]:
    """
    US-08: Minimum Night Flow Rule-based Detector.
    Detects water leaks by checking if flow_rate is greater than flow_threshold
    during designated night hours (default 23h-5h) when valve state is OFF.
    
    Returns a list of detected anomalies.
    Each anomaly is: {
        'type': 'NIGHT_FLOW',
        'score': float [0-1],
        'start': str (ISO date),
        'end': str (ISO date),
        'severity': 'MEDIUM' or 'HIGH'
    }
    """
    anomalies = []
    if df.empty:
        return anomalies
        
    df = df.copy()
    if "measure_date" not in df.columns:
        raise ValueError("DataFrame must contain 'measure_date' column.")
    
    # Ensure datetime index
    df["measure_date"] = pd.to_datetime(df["measure_date"])
    
    # Filter night hours (e.g. >= 23 or < 5)
    if start_hour > end_hour:
        night_mask = (df["measure_date"].dt.hour >= start_hour) | (df["measure_date"].dt.hour < end_hour)
    else:
        night_mask = (df["measure_date"].dt.hour >= start_hour) & (df["measure_date"].dt.hour < end_hour)
        
    # Check night conditions: is_night, state == OFF, flow_rate > flow_threshold
    state_off_mask = df["state"].astype(str).str.upper() == "OFF" if "state" in df.columns else True
    
    night_anomalies_df = df[night_mask & state_off_mask & (df["flow_rate"] > flow_threshold)]
    
    if night_anomalies_df.empty:
        return anomalies
        
    # Group consecutive minute anomalies into single events
    # We define a gap of > 15 minutes as separate events
    night_anomalies_df = night_anomalies_df.sort_values("measure_date")
    time_diffs = night_anomalies_df["measure_date"].diff()
    new_event_mask = time_diffs > pd.Timedelta(minutes=15)
    event_ids = new_event_mask.cumsum()
    
    for event_id, group in night_anomalies_df.groupby(event_ids):
        start_time = group["measure_date"].min()
        end_time = group["measure_date"].max()
        max_flow = group["flow_rate"].max()
        
        # Calculate a normalized score: how far above threshold?
        # Score is bounded between 0.1 and 1.0
        score = min(1.0, 0.1 + (max_flow - flow_threshold) / (max_flow + 0.1))
        
        # Determine severity based on leak size
        severity = "HIGH" if max_flow > 1.0 else "MEDIUM"
        
        anomalies.append({
            "type": "NIGHT_FLOW",
            "score": float(round(score, 2)),
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "severity": severity
        })
        
    logger.info(f"MNF detector found {len(anomalies)} night flow events.")
    return anomalies
