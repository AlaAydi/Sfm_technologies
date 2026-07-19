import pandas as pd
import numpy as np
from src.features.preprocessor import (
    resample_data,
    extract_time_features,
    extract_rolling_features,
    scale_features,
    preprocess_dataset
)

def test_resample_data():
    df = pd.DataFrame({
        "measure_date": pd.to_datetime(["2026-06-12 10:00:00", "2026-06-12 10:02:00"]),
        "flow_rate": [1.0, 3.0],
        "mac_address": ["MAC1", "MAC1"]
    })
    
    resampled = resample_data(df, freq="1min")
    
    # Output should have 3 rows (10:00, 10:01, 10:02)
    assert len(resampled) == 3
    assert list(resampled["measure_date"]) == list(pd.to_datetime([
        "2026-06-12 10:00:00",
        "2026-06-12 10:01:00",
        "2026-06-12 10:02:00"
    ]))
    # Linear interpolation: (1.0 + 3.0) / 2 = 2.0
    assert list(resampled["flow_rate"]) == [1.0, 2.0, 3.0]
    # mac_address preserved
    assert (resampled["mac_address"] == "MAC1").all()

def test_extract_time_features():
    df = pd.DataFrame({
        "measure_date": pd.to_datetime([
            "2026-06-12 10:00:00",  # day
            "2026-06-12 23:30:00",  # night start
            "2026-06-13 04:15:00",  # night end
            "2026-06-13 05:00:00"   # day
        ])
    })
    
    extracted = extract_time_features(df)
    assert list(extracted["hour_of_day"]) == [10, 23, 4, 5]
    assert list(extracted["is_night"]) == [0, 1, 1, 0]

def test_extract_rolling_features():
    # 3 minutes of data resampled
    df = pd.DataFrame({
        "measure_date": pd.to_datetime([
            "2026-06-12 10:00:00",
            "2026-06-12 10:01:00",
            "2026-06-12 10:02:00"
        ]),
        "flow_rate": [1.0, 2.0, 3.0]
    })
    
    extracted = extract_rolling_features(df, window="60min") # Use time window or count
    # Average flow_rate:
    # 10:00 -> 1.0
    # 10:01 -> (1+2)/2 = 1.5
    # 10:02 -> (1+2+3)/3 = 2.0
    assert list(extracted["rolling_mean_1h"]) == [1.0, 1.5, 2.0]

def test_scale_features():
    df = pd.DataFrame({
        "flow_rate": [0.0, 5.0, 10.0]
    })
    
    scaled_df, scaler = scale_features(df, column="flow_rate")
    
    assert list(scaled_df["flow_rate_scaled"]) == [0.0, 0.5, 1.0]
    assert scaler.data_min_[0] == 0.0
    assert scaler.data_max_[0] == 10.0

def test_preprocess_dataset():
    df = pd.DataFrame({
        "measure_date": pd.to_datetime(["2026-06-12 10:00:00", "2026-06-12 10:02:00"]),
        "flow_rate": [0.0, 10.0],
        "mac_address": ["MAC1", "MAC1"]
    })
    
    preprocessed, scaler = preprocess_dataset(df)
    
    assert len(preprocessed) == 3
    assert "hour_of_day" in preprocessed.columns
    assert "is_night" in preprocessed.columns
    assert "rolling_mean_1h" in preprocessed.columns
    assert "flow_rate_scaled" in preprocessed.columns
    assert preprocessed["flow_rate_scaled"].min() == 0.0
    assert preprocessed["flow_rate_scaled"].max() == 1.0
