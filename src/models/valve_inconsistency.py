import logging
import pandas as pd

logger = logging.getLogger(__name__)

def detect_valve_inconsistency(
    df: pd.DataFrame,
    flow_threshold: float = 0.5,
    min_duration_minutes: int = 5
) -> list[dict]:
    """
    US-10: Valve Inconsistency Detector.
    Identifies cases where state=OFF and flow_rate > 0.5 L/min for more than 5 minutes.
    
    Returns a list of detected anomalies:
    {
        'type': 'VALVE_INCONSISTENCY',
        'score': float [0-1], (based on duration of the condition)
        'start': str (ISO date),
        'end': str (ISO date),
        'severity': 'MEDIUM' or 'HIGH'
    }
    """
    anomalies = []
    if df.empty or "state" not in df.columns or "flow_rate" not in df.columns:
        return anomalies
        
    df = df.copy()
    df["measure_date"] = pd.to_datetime(df["measure_date"])
    df = df.sort_values("measure_date")
    
    # Condition: state is OFF and flow_rate > flow_threshold
    df["is_inconsistent"] = (df["state"].astype(str).str.upper() == "OFF") & (df["flow_rate"] > flow_threshold)
    
    # Find contiguous blocks of inconsistency
    # A block starts when is_inconsistent changes from False to True or time gap > 1 min
    df["group_id"] = (~df["is_inconsistent"]).cumsum()
    
    # Filter only inconsistent rows
    inconsistent_df = df[df["is_inconsistent"]]
    
    if inconsistent_df.empty:
        return anomalies
        
    for group_id, group in inconsistent_df.groupby("group_id"):
        # Calculate duration
        start_time = group["measure_date"].min()
        end_time = group["measure_date"].max()
        duration_minutes = (end_time - start_time).total_seconds() / 60.0
        
        if duration_minutes >= min_duration_minutes:
            max_flow = group["flow_rate"].max()
            
            # Score scales with duration: 5 min -> 0.5, 30 min -> 0.9, >= 60 min -> 1.0
            score = min(1.0, 0.5 + (duration_minutes - 5) / 100.0)
            
            # Severity: if duration is long (> 15 min) or flow is high (> 2.0 L/min) -> HIGH, else MEDIUM
            severity = "HIGH" if (duration_minutes > 15 or max_flow > 2.0) else "MEDIUM"
            
            anomalies.append({
                "type": "VALVE_INCONSISTENCY",
                "score": float(round(score, 2)),
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "severity": severity
            })
            
    logger.info(f"Valve inconsistency detector found {len(anomalies)} events.")
    return anomalies
