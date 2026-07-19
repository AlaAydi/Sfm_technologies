import logging
import pandas as pd
from sqlalchemy import create_engine
from src.config import DEFAULT_DATA_PATH, DATABASE_URL

logger = logging.getLogger(__name__)

def load_from_csv(file_path: str = None) -> pd.DataFrame:
    """
    Loads raw IoT data from a CSV file.
    """
    if file_path is None:
        file_path = str(DEFAULT_DATA_PATH)
    
    logger.info(f"Loading data from CSV: {file_path}")
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        logger.error(f"Error loading CSV file {file_path}: {e}")
        raise e

def load_measures(mac: str, start: str = None, end: str = None, db_url: str = DATABASE_URL) -> pd.DataFrame:
    """
    Loads IoT measures for a specific MAC address and optional date range.
    US-06: Connexion SQLAlchemy OK, load_measures(mac, start, end) -> DataFrame.
    If database connection fails, falls back to the local CSV.
    """
    logger.info(f"Loading measures for MAC={mac}, start={start}, end={end}")
    
    # Try database first
    try:
        engine = create_engine(db_url)
        # Verify connection
        with engine.connect() as conn:
            pass
        
        query = "SELECT id, consumption, flow_rate, mac_address, measure_date, received_at, state FROM droppy_measure WHERE mac_address = :mac"
        params = {"mac": mac}
        
        if start:
            query += " AND measure_date >= :start"
            params["start"] = start
        if end:
            query += " AND measure_date <= :end"
            params["end"] = end
            
        logger.info("Executing database query via SQLAlchemy")
        df = pd.read_sql(query, engine, params=params)
        return df
    except Exception as e:
        logger.warning(f"Database loading failed ({e}). Falling back to local CSV mock.")
        
        # Fallback to CSV
        df = load_from_csv()
        
        # Filter by MAC address
        df = df[df["mac_address"] == mac]
        
        # Filter by date range if provided
        if start or end:
            df["measure_date"] = pd.to_datetime(df["measure_date"])
            if start:
                df = df[df["measure_date"] >= pd.to_datetime(start)]
            if end:
                df = df[df["measure_date"] <= pd.to_datetime(end)]
                
        return df.reset_index(drop=True)
