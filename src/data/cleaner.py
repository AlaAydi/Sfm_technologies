import logging
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

def parse_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts and sanitizes data types:
    - measure_date, received_at to Datetime
    - flow_rate, consumption to Float
    - state to uppercase string
    """
    df = df.copy()
    
    # Parse datetimes
    for col in ["measure_date", "received_at"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
            
    # Parse numerics
    for col in ["flow_rate", "consumption"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            
    # Standardize string state (ON/OFF)
    if "state" in df.columns:
        df["state"] = df["state"].astype(str).str.strip().str.upper()
        # Clean invalid states to NaN
        df.loc[~df["state"].isin(["ON", "OFF"]), "state"] = np.nan
        
    return df

def drop_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    """
    Identifies and removes duplicate records.
    - Check duplicates by unique 'id'
    - Check duplicates by unique combination of ('measure_date', 'mac_address')
    """
    df = df.copy()
    initial_len = len(df)
    
    # Drop duplicates by ID if id exists
    if "id" in df.columns:
        df = df.drop_duplicates(subset=["id"], keep="first")
        
    # Drop duplicates by unique timestamp and MAC address combo
    subset_cols = []
    if "measure_date" in df.columns:
        subset_cols.append("measure_date")
    if "mac_address" in df.columns:
        subset_cols.append("mac_address")
        
    if len(subset_cols) > 0:
        df = df.drop_duplicates(subset=subset_cols, keep="first")
        
    removed = initial_len - len(df)
    if removed > 0:
        logger.info(f"Removed {removed} duplicate rows.")
        
    return df

def handle_nulls(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handles missing values (nulls) in the dataset:
    - Drops rows missing critical identifiers (measure_date, mac_address).
    - Fills minor missing values in flow_rate and consumption or leaves them for resampling.
    """
    df = df.copy()
    initial_len = len(df)
    
    # 1. Drop rows missing critical columns
    critical_cols = []
    if "measure_date" in df.columns:
        critical_cols.append("measure_date")
    if "mac_address" in df.columns:
        critical_cols.append("mac_address")
        
    df = df.dropna(subset=critical_cols)
    
    # 2. Drop rows where BOTH flow_rate and consumption are null
    check_cols = [c for c in ["flow_rate", "consumption"] if c in df.columns]
    if len(check_cols) > 0:
        df = df.dropna(subset=check_cols, how="all")
        
    # 3. For state, if null, we can forward fill it, as valve states change infrequently
    if "state" in df.columns:
        df["state"] = df["state"].ffill().bfill()
        
    dropped = initial_len - len(df)
    if dropped > 0:
        logger.info(f"Dropped {dropped} rows with critical missing values.")
        
    return df

def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Executes the complete cleaning pipeline: type parsing, null handling, duplicate removal.
    """
    logger.info("Starting data cleaning pipeline")
    df = parse_types(df)
    df = handle_nulls(df)
    df = drop_duplicates(df)
    logger.info(f"Data cleaning finished. Cleaned rows remaining: {len(df)}")
    return df
