import pandas as pd
import numpy as np
import pickle
import argparse
from datetime import datetime, timedelta
import brain  # Import feature engineering logic

MODEL_FILE = "tide_model.pkl"

def load_model():
    try:
        with open(MODEL_FILE, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        return None

def predict_at(model, dt):
    # Create single-row DataFrame
    df = pd.DataFrame({'datetime': [dt]})
    
    # Feature Engineering (reuse logic from brain.py)
    df = brain.add_features(df)
    
    # Select features
    features = [
        'hour_sin', 'hour_cos', 
        'year_sin', 'year_cos',
        'moon_phase_sin', 'moon_phase_cos',
        'moon_dist_sin', 'moon_dist_cos',
        'moon_decl_sin', 'moon_decl_cos',
        'interaction_phase_dist',
        'tide_m2_sin', 'tide_m2_cos'
    ]
    X = df[features]
    
    # Predict
    level = model.predict(X)[0]
    return level

def main():
    parser = argparse.ArgumentParser(description="Predict Tide Level")
    parser.add_argument("--time", type=str, help="Time to predict (YYYY-MM-DD HH:MM), defaults to now")
    parser.add_argument("--future", type=int, default=0, help="Hours into future")
    args = parser.parse_args()
    
    model = load_model()
    if not model:
        print("Model not found! Run brain.py first.")
        return
    
    if args.time:
        base_time = datetime.strptime(args.time, "%Y-%m-%d %H:%M")
    else:
        base_time = datetime.now()
        
    target_time = base_time + timedelta(hours=args.future)
    
    level = predict_at(model, target_time)
    
    print(f"🌊 Prediction for {target_time.strftime('%Y-%m-%d %H:%M')}")
    print(f"Level: {level:.2f} meters")

if __name__ == "__main__":
    main()
