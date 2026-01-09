# Temperature Sensor Module - DHT11/DHT22/DS18B20
# Injected when user adds temperature sensor module

# === METADATA ===
MODULE_ID = "temp_sensor"
MODULE_NAME = "Temperature Sensor"
MODULE_CAPS = ["TEMP"]

# === IMPORTS ===
"""
import dht
# For DS18B20: import onewire, ds18x20
"""

# === GLOBALS ===
"""
# DHT sensor
temp_sensor_{name} = dht.DHT{type}(machine.Pin({pin}))
last_temp_{name} = 0.0
last_humid_{name} = 0.0
"""

# === COMMANDS ===
"""
if cmd == "TEMP:{name}:READ":
    try:
        temp_sensor_{name}.measure()
        last_temp_{name} = temp_sensor_{name}.temperature()
        last_humid_{name} = temp_sensor_{name}.humidity()
        print(f"OK:TEMP:{name}:{{last_temp_{name}}}C:{{last_humid_{name}}}%")
    except Exception as e:
        print(f"ERR:TEMP:{name}:{{e}}")
    return True

if cmd == "TEMP:{name}:GET":
    print(f"OK:TEMP:{name}:{{last_temp_{name}}}C:{{last_humid_{name}}}%")
    return True
"""

# === INIT ===
"""
# Read initial temperature
try:
    temp_sensor_{name}.measure()
    last_temp_{name} = temp_sensor_{name}.temperature()
    last_humid_{name} = temp_sensor_{name}.humidity()
except:
    pass
"""
