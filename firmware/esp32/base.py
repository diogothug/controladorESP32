# ESP32 MicroPython - Minimal Base Firmware
# This is the core that all generated firmwares include
# Modules are injected by the generator

import machine
import sys
import time

try:
    import uselect
    HAS_USELECT = True
except:
    HAS_USELECT = False

# ============ CORE CONFIG ============
FIRMWARE_VERSION = "3.0.0"
DEVICE_TYPE = "ESP32_GEN"

# ============ SERIAL SETUP ============
if HAS_USELECT:
    spoll = uselect.poll()
    spoll.register(sys.stdin, uselect.POLLIN)

def read_input():
    """Non-blocking serial read"""
    if HAS_USELECT:
        if spoll.poll(0):
            return sys.stdin.readline()
    return None

# ============ MODULE REGISTRY ============
# Filled by generator with active modules
MODULES = []  # List of module names
CAPS = ["GPIO"]  # Capabilities list

# ============ INJECTED CODE MARKERS ============
# {{IMPORTS}}
# {{GLOBALS}}
# {{SETUP}}

# ============ COMMAND HANDLER ============
def handle_command(cmd):
    cmd = cmd.strip()
    
    # System commands
    if cmd == "SYS:HELLO":
        caps_str = ",".join(CAPS)
        print(f"SYS:HELLO:{DEVICE_TYPE}")
        print(f"OK:DEVICE={DEVICE_TYPE};FW={FIRMWARE_VERSION};CAPS={caps_str}")
        return True
    
    if cmd == "SYS:RESET":
        print("OK:SYS:RESET")
        time.sleep(0.1)
        machine.reset()
        return True
    
    if cmd == "SYS:INFO":
        import gc
        gc.collect()
        free = gc.mem_free()
        print(f"OK:SYS:INFO:MEM={free};MODULES={','.join(MODULES)}")
        return True
    
    # {{COMMANDS}}
    
    return False  # Command not handled

# ============ MAIN LOOP ============
print(f"SYS:READY:{DEVICE_TYPE}")

# {{INIT}}

while True:
    # Read and handle commands
    cmd = read_input()
    if cmd:
        if not handle_command(cmd):
            print("ERR:UNKNOWN_CMD")
    
    # {{LOOP}}
    
    time.sleep(0.01)  # 100 Hz base loop
