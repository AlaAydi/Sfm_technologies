import pandas as pd
import numpy as np
from src.data.cleaner import parse_types, drop_duplicates, handle_nulls, clean_dataset

def test_parse_types():
    df = pd.DataFrame({
        "measure_date": ["2026-06-12 10:30:00", "invalid_date"],
        "flow_rate": ["1.25", "invalid_num"],
        "consumption": [10, None],
        "state": ["off ", " ON"]
    })
    
    parsed = parse_types(df)
    
    assert pd.api.types.is_datetime64_any_dtype(parsed["measure_date"])
    assert parsed["measure_date"].isna().sum() == 1  # invalid_date becomes NaT
    
    assert pd.api.types.is_float_dtype(parsed["flow_rate"])
    assert parsed["flow_rate"].isna().sum() == 1  # invalid_num becomes NaN
    
    assert list(parsed["state"]) == ["OFF", "ON"]

def test_drop_duplicates():
    df = pd.DataFrame({
        "id": [1, 1, 2],
        "mac_address": ["MAC1", "MAC1", "MAC1"],
        "measure_date": ["2026-06-12 10:00:00", "2026-06-12 10:00:00", "2026-06-12 10:01:00"]
    })
    
    # Drops id duplicates
    cleaned = drop_duplicates(df)
    assert len(cleaned) == 2
    assert list(cleaned["id"]) == [1, 2]

def test_handle_nulls():
    df = pd.DataFrame({
        "mac_address": ["MAC1", None, "MAC1"],
        "measure_date": ["2026-06-12 10:00:00", "2026-06-12 10:01:00", None],
        "flow_rate": [1.5, 2.0, 1.8],
        "state": ["OFF", np.nan, np.nan]
    })
    
    cleaned = handle_nulls(df)
    
    # Should drop row 1 (missing mac) and row 2 (missing measure_date)
    assert len(cleaned) == 1
    assert cleaned.iloc[0]["mac_address"] == "MAC1"
    # State should be filled
    assert cleaned.iloc[0]["state"] == "OFF"

def test_clean_dataset():
    df = pd.DataFrame({
        "id": [1, 2, 2],
        "mac_address": ["MAC1", "MAC1", "MAC1"],
        "measure_date": ["2026-06-12 10:00:00", "2026-06-12 10:01:00", "2026-06-12 10:01:00"],
        "flow_rate": ["1.5", "2.0", "2.0"],
        "consumption": [10.0, 12.0, 12.0],
        "state": ["OFF", "ON", "ON"]
    })
    
    cleaned = clean_dataset(df)
    assert len(cleaned) == 2
    assert list(cleaned["id"]) == [1, 2]
