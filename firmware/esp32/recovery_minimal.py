# ESP32 Recovery Firmware - Minimal
# For device recovery: LED test, handshake, OTA
# ~80 lines only

import machine
import sys
import time

try:
    import uselect
    spoll = uselect.poll()
    spoll.register(sys.stdin, uselect.POLLIN)
    HAS_POLL = True
except:
    HAS_POLL = False

# Built-in LED (GPIO 2 on most ESP32)
led = machine.Pin(2, machine.Pin.OUT)
led.value(0)

# Version
VERSION = "3.0.0-recovery"

def read_input():
    if HAS_POLL and spoll.poll(0):
        return sys.stdin.readline()
    return None

def handle_command(cmd):
    cmd = cmd.strip().upper()
    
    if cmd == "SYS:HELLO":
        print("SYS:HELLO:ESP32_RECOVERY")
        print(f"OK:DEVICE=ESP32_RECOVERY;FW={VERSION};CAPS=LED,OTA")
        return
    
    if cmd == "SYS:RESET":
        print("OK:SYS:RESET")
        time.sleep(0.1)
        machine.reset()
        return
    
    if cmd == "LED:ON":
        led.value(1)
        print("OK:LED:ON")
        return
    
    if cmd == "LED:OFF":
        led.value(0)
        print("OK:LED:OFF")
        return
    
    if cmd == "LED:BLINK":
        for _ in range(5):
            led.value(1)
            time.sleep(0.2)
            led.value(0)
            time.sleep(0.2)
        print("OK:LED:BLINK")
        return
    
    if cmd.startswith("SYS:OTA:"):
        url = cmd[8:]
        print(f"OK:OTA:STARTING:{url}")
        try:
            import urequests
            import ota_updater
            ota_updater.update_from_url(url)
            print("OK:OTA:SUCCESS")
            machine.reset()
        except Exception as e:
            print(f"ERR:OTA:{e}")
        return
    
    print("ERR:UNKNOWN_CMD")

# Boot sequence - blink LED 3x
print(f"SYS:READY:ESP32_RECOVERY")
for _ in range(3):
    led.value(1)
    time.sleep(0.1)
    led.value(0)
    time.sleep(0.1)

# Main loop
while True:
    cmd = read_input()
    if cmd:
        handle_command(cmd)
    time.sleep(0.01)
