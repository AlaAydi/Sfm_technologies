import os
import pytest
import pandas as pd
import numpy as np
from src.models.isolation_forest import train_isolation_forest, predict_isolation_forest, get_model_path

def test_isolation_forest_flow():
    mac = "TEST_MAC"
    model_path = get_model_path(mac)
    
    # Clean up model if exists
    if os.path.exists(model_path):
        os.remove(model_path)
        
    # Generate 50 points of normal flow around 0.1
    # and 1 anomalous point of 5.0
    normal_flows = np.random.normal(0.1, 0.01, 50)
    flows = np.append(normal_flows, [5.0])
    
    times = pd.date_range("2026-06-12 10:00:00", periods=51, freq="1min")
    df = pd.DataFrame({
        "measure_date": times,
        "flow_rate": flows,
        "mac_address": [mac] * 51
    })
    
    # Train
    saved_path = train_isolation_forest(df, mac)
    assert os.path.exists(saved_path)
    
    # Predict
    anomalies = predict_isolation_forest(df, mac)
    
    # Clean up
    if os.path.exists(saved_path):
        os.remove(saved_path)
        
    assert len(anomalies) >= 1
    assert any(a["type"] == "FLOW_ANOMALY_IFOREST" for a in anomalies)
