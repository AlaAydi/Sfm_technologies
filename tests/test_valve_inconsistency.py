import pandas as pd
from src.models.valve_inconsistency import detect_valve_inconsistency

def test_valve_inconsistency_leak():
    # state = OFF, flow_rate = 0.8 (> 0.5) for 6 consecutive minutes
    times = pd.date_range("2026-06-12 10:00:00", periods=6, freq="1min")
    df = pd.DataFrame({
        "measure_date": times,
        "flow_rate": [0.8] * 6,
        "state": ["OFF"] * 6
    })
    
    anomalies = detect_valve_inconsistency(df, flow_threshold=0.5, min_duration_minutes=5)
    assert len(anomalies) == 1
    assert anomalies[0]["type"] == "VALVE_INCONSISTENCY"
    assert anomalies[0]["severity"] == "MEDIUM"

def test_valve_inconsistency_too_short():
    # state = OFF, flow_rate = 0.8 (> 0.5) for only 3 minutes
    times = pd.date_range("2026-06-12 10:00:00", periods=3, freq="1min")
    df = pd.DataFrame({
        "measure_date": times,
        "flow_rate": [0.8] * 3,
        "state": ["OFF"] * 3
    })
    
    anomalies = detect_valve_inconsistency(df, flow_threshold=0.5, min_duration_minutes=5)
    assert len(anomalies) == 0

def test_valve_inconsistency_valve_on():
    # state = ON, flow_rate = 0.8 (> 0.5) for 10 minutes (valid usage)
    times = pd.date_range("2026-06-12 10:00:00", periods=10, freq="1min")
    df = pd.DataFrame({
        "measure_date": times,
        "flow_rate": [0.8] * 10,
        "state": ["ON"] * 10
    })
    
    anomalies = detect_valve_inconsistency(df, flow_threshold=0.5, min_duration_minutes=5)
    assert len(anomalies) == 0
