import pandas as pd
import numpy as np
import pickle
import argparse
from datetime import datetime, timedelta
import brain  # Reuse feature engineering

MODEL_FILE = "tide_model.pkl"

def load_model():
    try:
        with open(MODEL_FILE, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        return None

def find_peaks(model, start_time, duration_hours=24):
    """Scan future prediction curve to find High/Low tides"""
    
    # Generate time points every 10 minutes
    timestamps = []
    current = start_time
    end_time = start_time + timedelta(hours=duration_hours)
    
    while current <= end_time:
        timestamps.append(current)
        current += timedelta(minutes=10)
    
    # Create DataFrame for batch prediction
    df = pd.DataFrame({'datetime': timestamps})
    df = brain.add_features(df)
    
    # Predict curve
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
    levels = model.predict(X)
    
    events = []
    
    # Find local extrema
    raw_events = []
    for i in range(1, len(levels) - 1):
        prev_l = levels[i-1]
        curr_l = levels[i]
        next_l = levels[i+1]
        
        t = timestamps[i]
        
        if curr_l > prev_l and curr_l > next_l:
            raw_events.append({"type": "🌊 PREAMAR (High)", "time": t, "level": curr_l})
        elif curr_l < prev_l and curr_l < next_l:
            raw_events.append({"type": "🔻 BAIXAMAR (Low)", "time": t, "level": curr_l})

    # Filter events (Must be separated by at least 4 hours)
    if not raw_events:
        return []

    events = [raw_events[0]]
    for e in raw_events[1:]:
        last_time = events[-1]["time"]
        if (e["time"] - last_time).total_seconds() > 4 * 3600:
            events.append(e)
            
    return events

def main():
    parser = argparse.ArgumentParser(description="Predict Tide Events")
    parser.add_argument("--hours", type=int, default=24, help="Hours to scan ahead")
    args = parser.parse_args()
    
    model = load_model()
    if not model:
        print("Model not found! Run brain.py.")
        return
    
    print(f"🔮 Scanning next {args.hours}h for Tide Events...")
    events = find_peaks(model, datetime.now(), args.hours)
    
    print("\nNext Events:")
    print("------------------------------------------------")
    for e in events:
        print(f"{e['time'].strftime('%Y-%m-%d %H:%M')} | {e['type']} | {e['level']:.2f}m")
    print("------------------------------------------------")

if __name__ == "__main__":
    main()
