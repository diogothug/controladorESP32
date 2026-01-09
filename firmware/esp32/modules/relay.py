# Relay Module - High Power Switching
# Injected when user adds relay module

# === METADATA ===
MODULE_ID = "relay"
MODULE_NAME = "Relay"
MODULE_CAPS = ["RELAY"]

# === GLOBALS ===
"""
relay_{name} = machine.Pin({pin}, machine.Pin.OUT)
relay_{name}.value(0)  # Default OFF
"""

# === COMMANDS ===
"""
if cmd.startswith("RELAY:{name}:"):
    action = cmd.split(":")[2]
    if action == "ON":
        relay_{name}.value(1)
        print("OK:RELAY:{name}:ON")
        return True
    elif action == "OFF":
        relay_{name}.value(0)
        print("OK:RELAY:{name}:OFF")
        return True
    elif action == "STATUS":
        print(f"OK:RELAY:{name}:{{relay_{name}.value()}}")
        return True
"""
