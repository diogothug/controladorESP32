import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import pickle
import math
from datetime import datetime

# Config
DATA_FILE = "data/tide_history.csv"
MODEL_FILE = "tide_model.pkl"

def add_features(df):
    """Adds advanced astronomical and cyclic features for precision"""
    df['datetime'] = pd.to_datetime(df['datetime'])
    
    # 1. Daily Cycle (24h)
    df['hour_sin'] = np.sin(2 * np.pi * df['datetime'].dt.hour / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['datetime'].dt.hour / 24)
    
    # 2. Annual Seasonal Cycle (365.25 days)
    day_of_year = df['datetime'].dt.dayofyear
    df['year_sin'] = np.sin(2 * np.pi * day_of_year / 365.25)
    df['year_cos'] = np.cos(2 * np.pi * day_of_year / 365.25)
    
    # 3. Precise Lunar Phase (29.53 days)
    ref_date = pd.Timestamp("2000-01-06 18:14:00")
    days_since_ref = (df['datetime'] - ref_date).dt.total_seconds() / (3600 * 24)
    lunar_phase = days_since_ref % 29.53058867
    
    df['moon_sin'] = np.sin(2 * np.pi * lunar_phase / 29.5306)
    df['moon_cos'] = np.cos(2 * np.pi * lunar_phase / 29.5306)
    
    # 4. Moon Illumination (Correlation with Spring/Neap tides)
    # 0 = New Moon, 0.5 = Quarter, 1.0 = Full Moon
    df['moon_illumination'] = 0.5 * (1 - np.cos(2 * np.pi * lunar_phase / 29.5306))
    
    # 5. Tidal Physics (M2 + S2 interaction proxy)
    m2_hours = 12.4206
    day_fraction = (df['datetime'].dt.hour * 3600 + df['datetime'].dt.minute * 60) / 3600
    df['tide_m2_sin'] = np.sin(2 * np.pi * (day_fraction * 24 / m2_hours))
    df['tide_m2_cos'] = np.cos(2 * np.pi * (day_fraction * 24 / m2_hours))

    return df

def train_model():
    print("🧠 Enhanced Tide AI Training")
    print("==========================")
    
    # Load Data
    try:
        df = pd.read_csv(DATA_FILE)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found. Run collector.py first!")
        return
    
    print(f"Loaded {len(df)} samples.")
    
    # Feature Engineering
    df = add_features(df)
    
    # Advanced Feature Set
    features = [
        'hour_sin', 'hour_cos', 
        'year_sin', 'year_cos',
        'moon_sin', 'moon_cos', 'moon_illumination',
        'tide_m2_sin', 'tide_m2_cos'
    ]
    target = 'level'
    
    X = df[features]
    y = df[target]
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, shuffle=False)
    
    # Train Gradient Boosting (Better for time series precision)
    print("Training Gradient Boosting Regressor...")
    model = GradientBoostingRegressor(
        n_estimators=500,     # More trees
        learning_rate=0.05,   # Slower learning for precision
        max_depth=5,          # Deeper trees
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"\nModel Performance:")
    print(f"MAE: {mae:.4f} meters")
    print(f"R²:  {r2:.4f}")
    
    # Save
    with open(MODEL_FILE, 'wb') as f:
        pickle.dump(model, f)
    
    print(f"\n✅ Model saved to {MODEL_FILE}")

if __name__ == "__main__":
    train_model()
