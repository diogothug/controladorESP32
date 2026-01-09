# LED Module - GPIO Digital Output
# Injected when user adds LED module

# === METADATA ===
MODULE_ID = "led"
MODULE_NAME = "LED"
MODULE_CAPS = ["LED"]

# === GLOBALS ===
# led_{name} = machine.Pin({pin}, machine.Pin.OUT)

# === COMMANDS ===
"""
if cmd.startswith("LED:{name}:"):
    action = cmd.split(":")[2]
    if action == "ON":
        led_{name}.value(1)
        print("OK:LED:{name}:ON")
        return True
    elif action == "OFF":
        led_{name}.value(0)
        print("OK:LED:{name}:OFF")
        return True
    elif action == "TOGGLE":
        led_{name}.value(1 - led_{name}.value())
        print(f"OK:LED:{name}:{{led_{name}.value()}}")
        return True
"""
