import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import pickle
import math
from datetime import datetime

# Config
DATA_FILE = "data/tide_history.csv"
MODEL_FILE = "tide_model.pkl"

def add_features(df):
    """Adds cyclic time features and approximation of moon phase"""
    df['datetime'] = pd.to_datetime(df['datetime'])
    
    # 1. Cyclic Hour (Daily cycle)
    # 24h cycle
    df['hour_sin'] = np.sin(2 * np.pi * df['datetime'].dt.hour / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['datetime'].dt.hour / 24)
    
    # 2. Lunar Phase Approximation
    # Lunar cycle approx 29.53 days
    # Reference new moon: Jan 6, 2000 (just a reference epoch)
    ref_date = pd.Timestamp("2000-01-06 18:14:00")
    df['days_since_ref'] = (df['datetime'] - ref_date).dt.total_seconds() / (3600 * 24)
    df['lunar_phase'] = df['days_since_ref'] % 29.53058867
    
    # Cyclic Lunar Phase
    df['moon_sin'] = np.sin(2 * np.pi * df['lunar_phase'] / 29.5306)
    df['moon_cos'] = np.cos(2 * np.pi * df['lunar_phase'] / 29.5306)
    
    # 3. Tide Physics (Semi-diurnal approx)
    # M2 constituent period: 12.4206 hours
    m2_hours = 12.4206
    day_fraction = (df['datetime'].dt.hour * 3600 + df['datetime'].dt.minute * 60) / 3600
    df['tide_wave_sin'] = np.sin(2 * np.pi * (day_fraction * 24 / m2_hours))
    
    return df

def train_model():
    print("🧠 Tide AI Training")
    print("===================")
    
    # Load Data
    try:
        df = pd.read_csv(DATA_FILE)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found. Run collector.py first!")
        return
    
    print(f"Loaded {len(df)} samples.")
    
    # Feature Engineering
    df = add_features(df)
    
    # Features & Target
    features = ['hour_sin', 'hour_cos', 'moon_sin', 'moon_cos', 'tide_wave_sin']
    target = 'level'
    
    X = df[features]
    y = df[target]
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    # Train
    print("Training Random Forest...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"\nModel Performance:")
    print(f"MAE: {mae:.4f} meters (Average Error)")
    print(f"R²:  {r2:.4f} (Fit Quality)")
    
    # Save
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"\n✅ Model saved to {MODEL_FILE}")

if __name__ == "__main__":
    train_model()
