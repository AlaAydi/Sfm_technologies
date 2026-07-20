import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_PATH = BASE_DIR / "1c69203573c4.csv"

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")  
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "droppy")

if DB_PASSWORD:
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    DATABASE_URL = f"postgresql://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# AI Pipeline Settings
DEFAULT_MAC_ADDRESS = "1C:69:20:35:73:C4"
NIGHT_START_HOUR = 23  # 23h
NIGHT_END_HOUR = 5     # 5h
RESAMPLE_FREQUENCY = "1min"
ROLLING_WINDOW_1H = "1h"

# Anomalies thresholds
VALVE_INCONSISTENCY_FLOW_THRESHOLD = 0.5  
VALVE_INCONSISTENCY_DURATION_MINUTES = 5
