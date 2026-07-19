import pandas as pd
from src.models.mnf import detect_night_flows

def test_detect_night_flows_leak():
    # 2 hours of data at night (23h to 01h)
    # state = OFF, flow_rate > threshold (0.1)
    df = pd.DataFrame({
        "measure_date": pd.to_datetime([
            "2026-06-12 23:00:00",
            "2026-06-12 23:01:00",
            "2026-06-12 23:02:00"
        ]),
        "flow_rate": [0.5, 0.6, 0.5],
        "state": ["OFF", "OFF", "OFF"]
    })
    
    anomalies = detect_night_flows(df, flow_threshold=0.1)
    assert len(anomalies) == 1
    assert anomalies[0]["type"] == "NIGHT_FLOW"
    assert anomalies[0]["severity"] == "MEDIUM"  # Max flow 0.6 < 1.0

def test_detect_night_flows_no_leak_daytime():
    # Daytime flow (10h), state = OFF, flow_rate > threshold
    df = pd.DataFrame({
        "measure_date": pd.to_datetime([
            "2026-06-12 10:00:00",
            "2026-06-12 10:01:00"
        ]),
        "flow_rate": [0.5, 0.6],
        "state": ["OFF", "OFF"]
    })
    
    anomalies = detect_night_flows(df, flow_threshold=0.1)
    assert len(anomalies) == 0

def test_detect_night_flows_no_leak_valve_on():
    # Nighttime flow, state = ON, flow_rate > threshold
    df = pd.DataFrame({
        "measure_date": pd.to_datetime([
            "2026-06-12 23:00:00",
            "2026-06-12 23:01:00"
        ]),
        "flow_rate": [0.5, 0.6],
        "state": ["ON", "ON"]
    })
    
    anomalies = detect_night_flows(df, flow_threshold=0.1)
    assert len(anomalies) == 0
