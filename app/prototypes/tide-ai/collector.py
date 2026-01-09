import requests
import json
import pandas as pd
import time
from datetime import datetime, timedelta
import os

# Configuration
HARBOR_ID = 1  # Porto de Ilhéus
API_BASE = "https://tabuamare.devtu.qzz.io/api/v1"
OUTPUT_FILE = "data/tide_history.csv"
DAYS_HISTORY = 30
DAYS_FUTURE = 7

def fetch_day(date_obj):
    month = date_obj.month
    day = date_obj.day
    url = f"{API_BASE}/tabua-mare/{HARBOR_ID}/{month}/[{day}]"
    
    try:
        print(f"Fetching {date_obj.strftime('%Y-%m-%d')}...", end="")
        response = requests.get(url, timeout=10)
        data = response.json()
        
        entries = []
        if data.get("data") and len(data["data"]) > 0:
            harbor = data["data"][0]
            if harbor.get("months"):
                days_data = harbor["months"][0].get("days", [])
                if days_data:
                    hours = days_data[0].get("hours", [])
                    for entry in hours:
                        # Parse time "HH:MM"
                        hm = entry["hour"].split(":")
                        dt = date_obj.replace(hour=int(hm[0]), minute=int(hm[1]), second=0)
                        
                        entries.append({
                            "timestamp": int(dt.timestamp()),
                            "datetime": dt.strftime("%Y-%m-%d %H:%M:%S"),
                            "level": float(entry["level"]),
                            "source": "API"
                        })
        print(f" OK ({len(entries)} points)")
        return entries
    except Exception as e:
        print(f" ERROR: {e}")
        return []

def main():
    print("🌊 Tide Data Collector")
    print("====================")
    
    all_data = []
    
    # Range: Past 30 days to Next 7 days
    start_date = datetime.now() - timedelta(days=DAYS_HISTORY)
    end_date = datetime.now() + timedelta(days=DAYS_FUTURE)
    
    current = start_date
    while current <= end_date:
        day_data = fetch_day(current)
        all_data.extend(day_data)
        current += timedelta(days=1)
        time.sleep(0.1) # Be nice to API
    
    if not all_data:
        print("No data collected!")
        return

    # Create DataFrame
    df = pd.DataFrame(all_data)
    
    # Sort by timestamp
    df = df.sort_values("timestamp")
    
    # Save
    os.makedirs("data", exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\n✅ Saved {len(df)} records to {OUTPUT_FILE}")
    
    # Preview
    print("\nData Preview:")
    print(df.head())
    print(df.tail())

if __name__ == "__main__":
    main()
