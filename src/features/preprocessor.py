import logging
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from src.config import NIGHT_START_HOUR, NIGHT_END_HOUR, RESAMPLE_FREQUENCY, ROLLING_WINDOW_1H

logger = logging.getLogger(__name__)

def resample_data(df: pd.DataFrame, freq: str = RESAMPLE_FREQUENCY) -> pd.DataFrame:
    """
    US-07: Resampling 1 min (interpolation linéaire).
    Resamples time series data to a regular frequency (default 1 minute)
    and uses linear interpolation to fill in missing values.
    Assumes df contains data for a single mac_address.
    """
    if df.empty:
        return df
        
    df = df.copy()
    
    # Check if 'measure_date' is set as index, if not, set it
    if df.index.name != "measure_date":
        if "measure_date" not in df.columns:
            raise ValueError("DataFrame must contain 'measure_date' column or index.")
        # Ensure it is datetime
        df["measure_date"] = pd.to_datetime(df["measure_date"])
        df = df.set_index("measure_date")
        
    # Sort index to ensure chronological order before resampling
    df = df.sort_index()
    
    # Store mac_address to put it back after resampling
    mac = df["mac_address"].iloc[0] if "mac_address" in df.columns else None
    
    # Resample numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    resampled_numeric = df[numeric_cols].resample(freq).interpolate(method="linear")
    
    # Resample categorical/state columns (forward-fill and backward-fill)
    non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns
    resampled_non_numeric = df[non_numeric_cols].resample(freq).ffill().bfill()
    
    # Combine back
    resampled_df = pd.concat([resampled_numeric, resampled_non_numeric], axis=1)
    
    # Restore mac_address column
    if mac:
        resampled_df["mac_address"] = mac
        
    # Reset index to bring 'measure_date' back as a column for easier processing down the line
    resampled_df = resampled_df.reset_index()
    
    logger.info(f"Resampled dataset from {len(df)} to {len(resampled_df)} rows")
    return resampled_df

def extract_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    US-07: Extract time-based features: hour_of_day, is_night.
    - hour_of_day: 0-23
    - is_night: 1 if hour between 23h-5h, else 0.
    """
    df = df.copy()
    if "measure_date" not in df.columns:
        raise ValueError("DataFrame must contain 'measure_date' column.")
        
    # Extract hour of day
    df["hour_of_day"] = df["measure_date"].dt.hour
    
    # Extract is_night (hours >= NIGHT_START_HOUR or hours < NIGHT_END_HOUR)
    # Default: 23h to 5h
    df["is_night"] = ((df["hour_of_day"] >= NIGHT_START_HOUR) | (df["hour_of_day"] < NIGHT_END_HOUR)).astype(int)
    
    return df

def extract_rolling_features(df: pd.DataFrame, window: str = ROLLING_WINDOW_1H) -> pd.DataFrame:
    """
    US-07: Extract rolling features: rolling_mean_1h.
    Computes the 1-hour rolling mean of flow_rate.
    """
    df = df.copy()
    if "flow_rate" not in df.columns:
        raise ValueError("DataFrame must contain 'flow_rate' column.")
        
    # Temporary index as datetime for rolling time window
    df = df.set_index("measure_date")
    df = df.sort_index()
    
    # Calculate rolling mean of flow_rate
    # Min periods = 1 to prevent NaN values at the start of the window
    df["rolling_mean_1h"] = df["flow_rate"].rolling(window, min_periods=1).mean()
    
    df = df.reset_index()
    return df

def scale_features(df: pd.DataFrame, column: str = "flow_rate") -> tuple[pd.DataFrame, MinMaxScaler]:
    """
    US-07: Normalisation MinMax of the specified column.
    """
    df = df.copy()
    if column not in df.columns:
        raise ValueError(f"DataFrame must contain '{column}' column.")
        
    scaler = MinMaxScaler()
    df[f"{column}_scaled"] = scaler.fit_transform(df[[column]])
    
    return df, scaler

def preprocess_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, MinMaxScaler]:
    """
    Executes the complete preprocessing pipeline:
    - Resampling to 1 min
    - Extracting time features
    - Extracting rolling features
    - Dropping any remaining NaNs from resampling boundaries
    - MinMax normalisation of flow_rate
    Returns preprocessed DataFrame and the fitted MinMax scaler.
    """
    logger.info("Starting preprocessing pipeline")
    df_resampled = resample_data(df)
    df_features = extract_time_features(df_resampled)
    df_features = extract_rolling_features(df_features)
    
    # Drop rows with NaN in flow_rate or rolling_mean_1h (e.g. at boundaries of resampling)
    df_features = df_features.dropna(subset=["flow_rate", "rolling_mean_1h"]).reset_index(drop=True)
    
    df_scaled, scaler = scale_features(df_features, column="flow_rate")
    logger.info("Preprocessing pipeline completed successfully")
    return df_scaled, scaler

