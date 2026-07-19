import os
import sys
import logging
from pathlib import Path

# Ensure src is in the import path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.data.loader import load_measures
from src.data.cleaner import clean_dataset
from src.features.preprocessor import preprocess_dataset
from src.models.mnf import detect_night_flows
from src.models.valve_inconsistency import detect_valve_inconsistency
from src.models.isolation_forest import train_isolation_forest, predict_isolation_forest
from src.models.forecaster import train_daily_forecaster, forecast_consumption, detect_consumption_deviation

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("PipelineDemo")

def main():
    logger.info("=========================================")
    logger.info("Droppy AI Pipeline - End-to-End Validation")
    logger.info("=========================================")
    
    # 1. Load data
    mac_address = "1C:69:20:35:73:C4"
    logger.info(f"Step 1: Loading data for MAC {mac_address}...")
    df_raw = load_measures(mac=mac_address)
    logger.info(f"Raw DataFrame loaded. Shape: {df_raw.shape}")
    
    # 2. Clean data
    logger.info("Step 2: Cleaning data...")
    df_cleaned = clean_dataset(df_raw)
    logger.info(f"Cleaned DataFrame. Shape: {df_cleaned.shape}")
    
    # 3. Preprocess and Engineer features
    logger.info("Step 3: Preprocessing and feature engineering...")
    df_preprocessed, scaler = preprocess_dataset(df_cleaned)
    logger.info(f"Preprocessed DataFrame. Shape: {df_preprocessed.shape}")
    
    # 4. Train Models
    logger.info("Step 4: Training detection and forecasting models...")
    iforest_path = train_isolation_forest(df_preprocessed, mac_address)
    forecaster_path = train_daily_forecaster(df_cleaned, mac_address)
    logger.info(f"Isolation Forest model trained: {iforest_path}")
    logger.info(f"Forecaster model trained: {forecaster_path}")
    
    # 5. Run Detections
    logger.info("Step 5: Running leak and anomaly detectors...")
    # MNF rule-based
    mnf_anomalies = detect_night_flows(df_preprocessed)
    # Valve Inconsistency rule-based
    valve_anomalies = detect_valve_inconsistency(df_preprocessed)
    # Isolation Forest ML
    iforest_anomalies = predict_isolation_forest(df_preprocessed, mac_address)
    # Consumption Deviation ML
    drift_anomalies = detect_consumption_deviation(df_cleaned, mac_address)
    
    # 6. Generate Forecast
    logger.info("Step 6: Generating 7-day consumption forecast...")
    forecasts = forecast_consumption(mac_address, days=7)
    
    # 7. Save datasets to disk
    workspace_dir = Path(__file__).resolve().parent
    cleaned_csv_path = workspace_dir / "1c69203573c4_cleaned.csv"
    preprocessed_csv_path = workspace_dir / "1c69203573c4_preprocessed.csv"
    
    logger.info(f"Saving cleaned data to: {cleaned_csv_path}")
    df_cleaned.to_csv(cleaned_csv_path, index=False)
    
    logger.info(f"Saving preprocessed data to: {preprocessed_csv_path}")
    df_preprocessed.to_csv(preprocessed_csv_path, index=False)
    
    # 8. Display results & statistics
    print("\n" + "="*50)
    print("                RESULTATS GLOBAUX")
    print("="*50)
    print(f"Lignes brutes chargées         : {len(df_raw)}")
    print(f"Lignes après nettoyage          : {len(df_cleaned)}")
    print(f"Lignes après rééchantillonnage  : {len(df_preprocessed)}")
    
    print("\n--- ANOMALIES DÉTECTÉES ---")
    all_anomalies = mnf_anomalies + valve_anomalies + iforest_anomalies + drift_anomalies
    if not all_anomalies:
        print("Aucune anomalie détectée dans les données historiques.")
    else:
        print(f"Total anomalies détectées: {len(all_anomalies)}")
        # Print top 10 anomalies for brevity
        for i, a in enumerate(all_anomalies[:10]):
            print(f"- [{a['type']}] Sévérité: {a['severity']}, Score: {a['score']}, Période: du {a['start']} au {a['end']}")
        if len(all_anomalies) > 10:
            print(f"... et {len(all_anomalies) - 10} autres anomalies.")
            
    print("\n--- PRÉVISIONS DE CONSOMMATION (7 prochains jours) ---")
    if not forecasts:
        print("Prévisions indisponibles (données historiques insuffisantes).")
    else:
        for f in forecasts:
            print(f"- Date: {f['date']} | Prévu: {f['predicted_consumption']:.3f} m³ | Intervalle: [{f['lower_bound']:.3f} - {f['upper_bound']:.3f}] m³")

if __name__ == "__main__":
    main()
