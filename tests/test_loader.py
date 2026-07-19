import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from src.data.loader import load_from_csv, load_measures

def test_load_from_csv_success():
    # Mock pd.read_csv
    with patch("pandas.read_csv") as mock_read_csv:
        mock_df = pd.DataFrame({"id": [1, 2], "flow_rate": [0.5, 0.6]})
        mock_read_csv.return_value = mock_df
        
        df = load_from_csv("dummy.csv")
        assert len(df) == 2
        assert list(df.columns) == ["id", "flow_rate"]
        mock_read_csv.assert_called_once_with("dummy.csv")

def test_load_from_csv_failure():
    with patch("pandas.read_csv") as mock_read_csv:
        mock_read_csv.side_effect = Exception("File not found")
        
        with pytest.raises(Exception):
            load_from_csv("non_existent.csv")

@patch("src.data.loader.load_from_csv")
def test_load_measures_fallback(mock_load_csv):
    # Setup mock data in CSV fallback
    mock_df = pd.DataFrame({
        "id": [101, 102, 103],
        "consumption": [1.0, 1.1, 1.2],
        "flow_rate": [0.1, 0.2, 0.3],
        "mac_address": ["AA:BB:CC:DD", "1C:69:20:35:73:C4", "1C:69:20:35:73:C4"],
        "measure_date": ["2026-06-12 10:00:00", "2026-06-12 10:01:00", "2026-06-12 10:02:00"],
        "received_at": ["2026-06-12 10:00:05", "2026-06-12 10:01:05", "2026-06-12 10:02:05"],
        "state": ["OFF", "OFF", "ON"]
    })
    mock_load_csv.return_value = mock_df
    
    # We load measures for mac="1C:69:20:35:73:C4"
    # Database URL is dummy to force failure and trigger fallback
    df = load_measures(mac="1C:69:20:35:73:C4", db_url="postgresql://invalid:invalid@localhost/db")
    
    assert len(df) == 2
    assert (df["mac_address"] == "1C:69:20:35:73:C4").all()
    assert list(df["id"]) == [102, 103]
