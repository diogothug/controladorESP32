# NeoPixel Module - WS2812B LED Strip
# Injected when user adds NeoPixel module

# === METADATA ===
MODULE_ID = "neopixel"
MODULE_NAME = "NeoPixel"
MODULE_CAPS = ["NEO", "ANIM"]

# === IMPORTS ===
"""
import neopixel
import math
import random
"""

# === GLOBALS ===
"""
neopixels = {}
current_anim = None
anim_pin = None
anim_time = 0.0
GLOBAL_BRIGHTNESS = 0.12

def hsv_to_rgb(h, s, v):
    h = h % 360
    s = max(0, min(1, s))
    v = max(0, min(1, v))
    c = v * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = v - c
    if h < 60: r, g, b = c, x, 0
    elif h < 120: r, g, b = x, c, 0
    elif h < 180: r, g, b = 0, c, x
    elif h < 240: r, g, b = 0, x, c
    elif h < 300: r, g, b = x, 0, c
    else: r, g, b = c, 0, x
    return (int((r + m) * 255), int((g + m) * 255), int((b + m) * 255))

def apply_brightness(r, g, b):
    return (int(r * GLOBAL_BRIGHTNESS), int(g * GLOBAL_BRIGHTNESS), int(b * GLOBAL_BRIGHTNESS))
"""

# === COMMANDS ===
"""
if cmd.startswith("NEO:"):
    parts = cmd.split(":")
    pin_num = int(parts[1])
    
    if len(parts) >= 3 and parts[2] == "CLEAR":
        if pin_num in neopixels:
            neopixels[pin_num].fill((0,0,0))
            neopixels[pin_num].write()
        current_anim = None
        print(f"OK:NEO:{pin_num}:CLEAR")
        return True
    
    if len(parts) >= 4 and parts[2] == "ANIM":
        anim_type = parts[3]
        if pin_num not in neopixels:
            p = machine.Pin(pin_num, machine.Pin.OUT)
            neopixels[pin_num] = neopixel.NeoPixel(p, {pixel_count})
        anim_pin = pin_num
        current_anim = anim_type
        anim_time = 0.0
        print(f"OK:NEO:{pin_num}:ANIM:{anim_type}")
        return True
    
    if len(parts) >= 4:
        idx = int(parts[2])
        r, g, b = map(int, parts[3].split(","))
        if pin_num not in neopixels:
            p = machine.Pin(pin_num, machine.Pin.OUT)
            neopixels[pin_num] = neopixel.NeoPixel(p, {pixel_count})
        r, g, b = apply_brightness(r, g, b)
        neopixels[pin_num][idx] = (r, g, b)
        neopixels[pin_num].write()
        print(f"OK:NEO:{pin_num}:{idx}:{r},{g},{b}")
        return True

if cmd.startswith("BRIGHT:"):
    val = int(cmd.split(":")[1])
    GLOBAL_BRIGHTNESS = max(0, min(100, val)) / 100.0
    print(f"OK:BRIGHT:{val}")
    return True
"""

# === LOOP ===
"""
anim_time += 0.016
if current_anim and anim_pin in neopixels:
    np = neopixels[anim_pin]
    if current_anim == "RAINBOW":
        for i in range(len(np)):
            hue = ((i * 360 / len(np)) + anim_time * 60) % 360
            r, g, b = hsv_to_rgb(hue, 1.0, 1.0)
            r, g, b = apply_brightness(r, g, b)
            np[i] = (r, g, b)
        np.write()
    elif current_anim == "SPARKLE":
        for i in range(len(np)):
            r, g, b = np[i]
            np[i] = (int(r * 0.9), int(g * 0.9), int(b * 0.9))
        idx = random.randint(0, len(np) - 1)
        np[idx] = apply_brightness(255, 255, 255)
        np.write()
"""
