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
    
    # Epoch J2000 (2000-01-01 12:00:00 UTC)
    # Using a fixed reference allows consistent phase calculation across years
    ref_date = pd.Timestamp("2000-01-01 12:00:00")
    t_days = (df['datetime'] - ref_date).dt.total_seconds() / (3600 * 24)
    
    # 1. Daily Cycle (24h) - Earth Rotation
    df['hour_sin'] = np.sin(2 * np.pi * df['datetime'].dt.hour / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['datetime'].dt.hour / 24)
    
    # 2. Annual Seasonal Cycle (365.25 days) - Solstices/Equinoxes
    day_of_year = df['datetime'].dt.dayofyear
    df['year_sin'] = np.sin(2 * np.pi * day_of_year / 365.2524)
    df['year_cos'] = np.cos(2 * np.pi * day_of_year / 365.2524)
    
    # 3. Synodic Month (29.53059 days) - Moon Phases (New/Full)
    # Primary driver of Spring/Neap tides
    synodic_period = 29.53059
    synodic_phase = (t_days % synodic_period) / synodic_period
    df['moon_phase_sin'] = np.sin(2 * np.pi * synodic_phase)
    df['moon_phase_cos'] = np.cos(2 * np.pi * synodic_phase)
    
    # 4. Anomalistic Month (27.55455 days) - Moon Distance (Perigee/Apogee)
    # Affects amplitude (Perigee = stronger tides)
    anomalistic_period = 27.55455
    anomalistic_phase = (t_days % anomalistic_period) / anomalistic_period
    df['moon_dist_sin'] = np.sin(2 * np.pi * anomalistic_phase)
    df['moon_dist_cos'] = np.cos(2 * np.pi * anomalistic_phase)
    
    # 5. Tropical Month (27.32158 days) - Moon Declination
    # Affects Diurnal Inequality (difference between two highs)
    tropical_period = 27.32158
    tropical_phase = (t_days % tropical_period) / tropical_period
    df['moon_decl_sin'] = np.sin(2 * np.pi * tropical_phase)
    df['moon_decl_cos'] = np.cos(2 * np.pi * tropical_phase)
    
    # 6. Interaction Terms (Harmonics)
    # "King Tides" happen when Perigee coincides with Full/New Moon
    df['interaction_phase_dist'] = df['moon_phase_cos'] * df['moon_dist_cos']
    
    # 7. Tidal Physics (M2 + S2 interaction proxy)
    m2_hours = 12.4206
    day_fraction = (df['datetime'].dt.hour * 3600 + df['datetime'].dt.minute * 60) / 3600
    df['tide_m2_sin'] = np.sin(2 * np.pi * (day_fraction * 24 / m2_hours))
    df['tide_m2_cos'] = np.cos(2 * np.pi * (day_fraction * 24 / m2_hours))

    return df

def train_model():
    print("🧠 Lunar Physics Tide AI Training")
    print("===============================")
    
    # Load Data
    try:
        df = pd.read_csv(DATA_FILE)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found. Run collector.py first!")
        return
    
    print(f"Loaded {len(df)} samples.")
    
    # Feature Engineering
    df = add_features(df)
    
    # Advanced Feature Set including Physics
    features = [
        'hour_sin', 'hour_cos', 
        'year_sin', 'year_cos',
        'moon_phase_sin', 'moon_phase_cos',
        'moon_dist_sin', 'moon_dist_cos',
        'moon_decl_sin', 'moon_decl_cos',
        'interaction_phase_dist',
        'tide_m2_sin', 'tide_m2_cos'
    ]
    target = 'level'
    
    X = df[features]
    y = df[target]
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.1, shuffle=False)
    
    # Train Gradient Boosting
    print("Training Gradient Boosting Regressor (Physics Enhanced)...")
    model = GradientBoostingRegressor(
        n_estimators=600,     # Increased estimators
        learning_rate=0.04,   # Slightly lower LR
        max_depth=6,          # Deeper trees for complex interactions
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
