# ESP32 MicroPython - Generated Firmware
# Modules: StatusLED
# Version: 3.1.0

import machine
import sys
import time

try:
    import uselect
    spoll = uselect.poll()
    spoll.register(sys.stdin, uselect.POLLIN)
    HAS_POLL = True
except Exception:
    HAS_POLL = False

try:
    import json
    HAS_JSON = True
except Exception:
    HAS_JSON = False



# ============ CONFIG ============
# ============ CONFIG ============
FIRMWARE_VERSION = "3.1.0"
DEVICE_TYPE = "ESP32_GEN"
MODULES = ["StatusLED"]
CAPS = ["GPIO","LED"]

# ============ INTENT (Premium) ============
# The universe this firmware believes it lives in.
INTENT = {
    "app_name": "TestApp",
    "version": "0.0.1",
    "modules": ["StatusLED"],
    "generated_by": "Test"
}

# ============ DEVICE MODES ============
MODES = ["AMBIENT", "PARTY", "SIGNAGE", "POWER_SAVE"]
MODE_CONFIG = {
    "AMBIENT": {"fps": 30, "brightness": 50, "speed": "slow"},
    "PARTY": {"fps": 60, "brightness": 100, "speed": "fast"},
    "SIGNAGE": {"fps": 20, "brightness": 70, "speed": "medium"},
    "POWER_SAVE": {"fps": 10, "brightness": 20, "speed": "slow"}
}
current_mode = "AMBIENT"

# ============ BOOT PROFILES ============
BOOT_MODES = ["LAST_STATE", "SAFE", "SCRIPT"]
boot_mode = "LAST_STATE"
boot_script = []

# ============ SHARED DATA STORE ============
# Stores dynamic data from API (Weather, Crypto, Tide)
# Keys: TEMP, TIDE, MOON, BTC, etc.
SHARED_DATA = {}

def save_state():
    if not HAS_JSON:
        return
    try:
        state = {
            "mode": current_mode,
            "boot_mode": boot_mode,
            "boot_script": boot_script
        }
        with open("state.json", "w") as f:
            json.dump(state, f)
        print("OK:STATE:SAVED")
    except Exception as e:
        print(f"ERR:STATE:SAVE:{e}")

def load_state():
    global current_mode, boot_mode, boot_script
    if not HAS_JSON:
        return False
    try:
        with open("state.json", "r") as f:
            state = json.load(f)
            current_mode = state.get("mode", "AMBIENT")
            boot_mode = state.get("boot_mode", "LAST_STATE")
            boot_script = state.get("boot_script", [])
        return True
    except Exception:
        return False

def apply_mode(mode):
    global current_mode
    if mode in MODES:
        current_mode = mode
        cfg = MODE_CONFIG[mode]
        print(f"OK:MODE:{mode}:FPS={cfg['fps']};BRIGHT={cfg['brightness']};SPEED={cfg['speed']}")
        return True
    return False

# ============ WATCHDOG & RECOVERY ============
WATCHDOG_TIMEOUT = 5000  # 5 seconds
CRASH_THRESHOLD = 3      # Enter safe mode after 3 crashes
watchdog_last = 0
crash_count = 0
last_crash_reason = ""

def watchdog_feed():
    global watchdog_last
    watchdog_last = time.ticks_ms()

def watchdog_check():
    global last_crash_reason
    if time.ticks_diff(time.ticks_ms(), watchdog_last) > WATCHDOG_TIMEOUT:
        last_crash_reason = "WATCHDOG_TIMEOUT"
        handle_crash(last_crash_reason)
        return True
    return False

# === FASTLED MATH PORT FOR MICROPYTHON ===
import math

def sin8(theta):
    theta = theta & 0xFF
    return int((math.sin(theta * math.pi * 2 / 255) + 1) * 127.5)

def cos8(theta):
    return sin8(theta + 64)

def scale8(i, scale):
    return (i * scale) >> 8

def qadd8(i, j):
    t = i + j
    if t > 255: return 255
    return t

def qsub8(i, j):
    t = i - j
    if t < 0: return 0
    return t

def color_from_palette(palette, index, brightness=255):
    entry_count = len(palette)
    region_size = 256 / entry_count
    
    entry_index = int(index // region_size)
    offset = int(index % region_size)
    ratio = offset / region_size
    
    c1 = palette[entry_index % entry_count]
    c2 = palette[(entry_index + 1) % entry_count]
    
    r = c1[0] + (c2[0] - c1[0]) * ratio
    g = c1[1] + (c2[1] - c1[1]) * ratio
    b = c1[2] + (c2[2] - c1[2]) * ratio
    
    if brightness != 255:
        r = scale8(int(r), brightness)
        g = scale8(int(g), brightness)
        b = scale8(int(b), brightness)
        
    return (int(r), int(g), int(b))

# === PREMIUM ANIMATION HELPERS ===

# Gamma 2.8 lookup table for perceptual brightness (256 entries)
GAMMA_TABLE = [
    0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,
    1,1,1,1,2,2,2,2,2,2,2,2,3,3,3,3,
    3,3,4,4,4,4,5,5,5,5,5,6,6,6,6,7,
    7,7,8,8,8,9,9,9,10,10,10,11,11,11,12,12,
    13,13,13,14,14,15,15,16,16,17,17,18,18,19,19,20,
    20,21,21,22,22,23,24,24,25,25,26,27,27,28,29,29,
    30,31,31,32,33,34,34,35,36,37,37,38,39,40,40,41,
    42,43,44,45,46,46,47,48,49,50,51,52,53,54,55,56,
    57,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,
    75,76,77,78,80,81,82,84,85,86,88,89,90,92,93,95,
    96,98,99,101,102,104,105,107,109,110,112,114,115,117,119,120,
    122,124,126,127,129,131,133,135,137,138,140,142,144,146,148,150,
    152,154,156,158,160,162,164,167,169,171,173,175,177,180,182,184,
    186,189,191,193,196,198,200,203,205,208,210,213,215,218,220,223,
    225,228,231,233,236,239,241,244,247,249,252,255,255,255,255,255
]

def gamma_correct(r, g, b):
    return (GAMMA_TABLE[r], GAMMA_TABLE[g], GAMMA_TABLE[b])

# Easing functions for smooth animations (FastLED-style)
def ease8InOutQuad(i):
    i = max(0, min(255, i))
    if i < 128:
        return (i * i) >> 7
    j = 255 - i
    return 255 - ((j * j) >> 7)

def ease8InOutCubic(i):
    i = max(0, min(255, i))
    j = i
    if j < 128:
        return (j * j * j) >> 14
    j = 255 - j
    return 255 - ((j * j * j) >> 14)

# Triangle and quadratic wave functions
def triwave8(x):
    x = x & 0xFF
    if x < 128:
        return x * 2
    return 255 - (x - 128) * 2

def quadwave8(x):
    return ease8InOutQuad(triwave8(x))

def cubicwave8(x):
    return ease8InOutCubic(triwave8(x))

# HSV to RGB conversion for smooth color transitions
def hsv_to_rgb(h, s, v):
    h = h % 256
    if s == 0:
        return (v, v, v)
    region = h // 43
    remainder = (h - (region * 43)) * 6
    p = (v * (255 - s)) >> 8
    q = (v * (255 - ((s * remainder) >> 8))) >> 8
    t = (v * (255 - ((s * (255 - remainder)) >> 8))) >> 8
    if region == 0: return (v, t, p)
    if region == 1: return (q, v, p)
    if region == 2: return (p, v, t)
    if region == 3: return (p, q, v)
    if region == 4: return (t, p, v)
    return (v, p, q)

# Smooth linear interpolation for color blending
def lerp_rgb(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t)
    )

# Smooth eased interpolation (feels more natural)
def lerp_rgb_eased(c1, c2, t):
    t = max(0.0, min(1.0, t))
    eased_t = ease8InOutQuad(int(t * 255)) / 255.0
    return lerp_rgb(c1, c2, eased_t)

# Crossfade state for smooth animation transitions
CROSSFADE_DURATION = 300  # ms
crossfade_start = 0
crossfade_progress = 1.0
prev_buffer = []
next_anim = ""

def start_crossfade(new_anim, led_count):
    global crossfade_start, crossfade_progress, next_anim, prev_buffer
    crossfade_start = time.ticks_ms()
    crossfade_progress = 0.0
    next_anim = new_anim
    # Save current LED state to prev_buffer
    prev_buffer = [(0,0,0)] * led_count

def update_crossfade():
    global crossfade_progress
    if crossfade_progress >= 1.0:
        return 1.0
    elapsed = time.ticks_diff(time.ticks_ms(), crossfade_start)
    crossfade_progress = min(1.0, elapsed / CROSSFADE_DURATION)
    return ease8InOutQuad(int(crossfade_progress * 255)) / 255.0

# FASTLED PALETTES
PALETTE_RAINBOW = [
    (255, 0, 0), (171, 85, 0), (171, 171, 0), (0, 255, 0),
    (0, 171, 85), (0, 0, 255), (85, 0, 171), (255, 0, 255)
]
PALETTE_OCEAN = [
    (0, 0, 50), (0, 20, 100), (0, 100, 200), (0, 200, 255),
    (50, 255, 200), (0, 200, 255), (0, 100, 200), (0, 20, 100)
]
PALETTE_FIRE = [
    (0, 0, 0), (30, 0, 0), (100, 0, 0), (180, 20, 0),
    (255, 50, 0), (255, 120, 0), (255, 200, 0), (255, 255, 100)
]
PALETTE_CLOUD = [
    (50, 50, 80), (100, 100, 120), (150, 150, 180), (200, 200, 220),
    (220, 220, 220), (200, 200, 220), (150, 150, 180), (100, 100, 120)
]

# === GLOBAL HELPER FUNCTIONS ===
def safe_sleep(duration):
    time.sleep(duration)
    # Check for serial input during sleep to allow interruption
    if HAS_POLL and sys.stdin in uselect.select([sys.stdin], [], [], 0)[0]:
        return


# ============ EVENT BUS ============
def dispatch_event(evt):
    # 1. Print to Serial (always)
    print(f"EVT:{evt}")
    
    # 2. Check Automation Rules (if enabled)
    if 'check_rules' in globals():
        check_rules(evt)

def handle_crash(reason):
    global crash_count, boot_mode
    crash_count += 1
    print(f"SYS:CRASH:{reason}:COUNT={crash_count}")
    # Auto enter safe mode after threshold
    if crash_count >= CRASH_THRESHOLD:
        boot_mode = "SAFE"
        save_state()
        print("SYS:CRASH:SAFE_MODE_ENABLED")
    # Store crash info
    try:
        with open("crash.log", "a") as f:
            f.write(f"{time.time()}:{reason}\n")
    except Exception:
        pass

# ============ GLOBALS ============
led_StatusLED = machine.Pin(2, machine.Pin.OUT)
led_StatusLED.value(0)

# ============ SERIAL ============
def read_input():
    if HAS_POLL and spoll.poll(0):
        return sys.stdin.readline()
    return None

# ============ COMMAND HANDLER ============
def handle_command(cmd):
    global current_mode, boot_mode, boot_script, crash_count, last_crash_reason
    cmd = cmd.strip()
    
    if cmd == "SYS:HELLO":
        print(f"SYS:HELLO:{DEVICE_TYPE}")
        print(f"OK:DEVICE={DEVICE_TYPE};FW={FIRMWARE_VERSION};CAPS={','.join(CAPS)}")
        return True
    
    if cmd == "SYS:RESET":
        print("OK:SYS:RESET")
        time.sleep(0.1)
        machine.reset()
    
    if cmd == "SYS:INFO":
        import gc
        gc.collect()
        print(f"OK:SYS:INFO:MEM={gc.mem_free()};MODULES={','.join(MODULES)}")
        return True

    # ============ COMMAND HANDLERS ============

def set_tide_level(level):
    # Manual Override (Testing)
    tide_physics["level_abs"] = level
    tide_physics["timestamp"] = time.time()
    tide_update_intelligence()

def set_tide_direction(direction):
    # Manual Override
    tide_cycle["type"] = direction
    SHARED_DATA["TIDE_DIR"] = direction

    # ============ VARIABLE COMMANDS ============
    if cmd.startswith("VAR:SET:"):
        # VAR:SET:KEY:VALUE
        parts = cmd.split(":")
        if len(parts) >= 4:
            key = parts[2]
            val_str = parts[3]
            try:
                # Try converting to float/int
                if "." in val_str:
                    val = float(val_str)
                else:
                    val = int(val_str)
            except Exception:
                val = val_str
            SHARED_DATA[key] = val
            print(f"OK:VAR:SET:{key}:{val}")
            return True

    if cmd == "VAR:LIST":
        # Print all vars
        print("OK:VAR:LIST:" + ",".join([f"{k}={v}" for k, v in SHARED_DATA.items()]))
        return True

    # ============ TELEMETRY COMMANDS ============
    if cmd == "STATS:FPS":
        actual_fps = 1.0 / loop_delay if loop_delay > 0 else 0
        print(f"OK:STATS:FPS:{actual_fps:.1f}")
        return True
    
    if cmd == "STATS:CPU":
        # CPU estimation based on loop time (higher time = higher load)
        import gc
        gc.collect()
        cpu_estimate = min(100, int(loop_time * 1000))  # ms to percentage
        print(f"OK:STATS:CPU:{cpu_estimate}")
        return True
    
    if cmd == "STATS:MEM":
        import gc
        gc.collect()
        mem_free = gc.mem_free()
        mem_alloc = gc.mem_alloc()
        mem_total = mem_free + mem_alloc
        pct_free = int(mem_free * 100 / mem_total) if mem_total > 0 else 0
        print(f"OK:STATS:MEM:FREE={mem_free};ALLOC={mem_alloc};TOTAL={mem_total};PCT={pct_free}")
        return True
    
    if cmd == "STATS:TEMP":
        try:
            import esp32
            temp = esp32.raw_temperature()  # In Fahrenheit
            temp_c = (temp - 32) * 5 / 9
            print(f"OK:STATS:TEMP:{temp_c:.1f}C")
        except Exception:
            print("OK:STATS:TEMP:N/A")
        return True
    
    if cmd == "STATS:ALL":
        import gc
        gc.collect()
        actual_fps = 1.0 / loop_delay if loop_delay > 0 else 0
        mem_free = gc.mem_free()
        cpu_estimate = min(100, int(loop_time * 1000))
        try:
            import esp32
            temp = (esp32.raw_temperature() - 32) * 5 / 9
            temp_str = f"{temp:.1f}C"
        except Exception:
            temp_str = "N/A"
        print(f"OK:STATS:ALL:FPS={actual_fps:.1f};CPU={cpu_estimate};MEM={mem_free};TEMP={temp_str}")
        return True

    # ============ WATCHDOG COMMANDS ============
    if cmd == "WATCHDOG:FEED":
        watchdog_feed()
        print("OK:WATCHDOG:FED")
        return True
    
    if cmd == "WATCHDOG:STATUS":
        elapsed = time.ticks_diff(time.ticks_ms(), watchdog_last)
        remaining = max(0, WATCHDOG_TIMEOUT - elapsed)
        print(f"OK:WATCHDOG:STATUS:ELAPSED={elapsed};TIMEOUT={WATCHDOG_TIMEOUT};REMAINING={remaining}")
        return True
    
    if cmd == "CRASH:LAST":
        print(f"OK:CRASH:LAST:{last_crash_reason or 'NONE'}")
        return True
    
    if cmd == "CRASH:COUNT":
        print(f"OK:CRASH:COUNT:{crash_count}")
        return True
    
    if cmd == "CRASH:RESET":
        # global crash_count, last_crash_reason
        crash_count = 0
        last_crash_reason = ""
        # Also clear crash log
        try:
            import os
            os.remove("crash.log")
        except Exception:
            pass
        print("OK:CRASH:RESET")
        return True
    
    if cmd == "CRASH:LOG":
        try:
            with open("crash.log", "r") as f:
                for line in f:
                    print(f"CRASH:LOG:{line.strip()}")
            print("OK:CRASH:LOG:END")
        except Exception:
            print("OK:CRASH:LOG:EMPTY")
        return True
    if cmd == "MODE:GET":
        cfg = MODE_CONFIG[current_mode]
        print(f"OK:MODE:{current_mode}:FPS={cfg['fps']};BRIGHT={cfg['brightness']}")
        return True
    
    if cmd == "MODE:LIST":
        print(f"OK:MODE:LIST:{','.join(MODES)}")
        return True
    
    if cmd.startswith("MODE:SET:"):
        mode = cmd.split(":")[-1].upper()
        if apply_mode(mode):
            save_state()
        else:
            print(f"ERR:MODE:INVALID:{mode}")
        return True

    if cmd.startswith("BRIGHT:"):
        try:
            val = int(cmd.split(":")[1])
            SHARED_DATA['BRIGHTNESS'] = val
            print(f"OK:GLOBAL:BRIGHT:{val}")
        except Exception:
            pass
        return True

    # Boot Profile Commands
    if cmd == "BOOT:GET":
        print(f"OK:BOOT:{boot_mode}")
        return True
    
    if cmd == "BOOT:LIST":
        print(f"OK:BOOT:LIST:{','.join(BOOT_MODES)}")
        return True
    
    if cmd.startswith("BOOT:SET:"):
        mode = cmd.split(":")[-1].upper()
        if mode in BOOT_MODES:
            boot_mode = mode
            save_state()
            print(f"OK:BOOT:{boot_mode}")
        else:
            print(f"ERR:BOOT:INVALID:{mode}")
        return True
    
    if cmd.startswith("BOOT:SCRIPT:ADD:"):
        script_cmd = cmd[16:]
        boot_script.append(script_cmd)
        save_state()
        print(f"OK:BOOT:SCRIPT:ADD:{len(boot_script)}")
        return True
    
    if cmd == "BOOT:SCRIPT:CLEAR":
        boot_script = []
        save_state()
        print("OK:BOOT:SCRIPT:CLEAR")
        return True
    
    if cmd == "BOOT:SCRIPT:LIST":
        for i, s in enumerate(boot_script):
            print(f"BOOT:SCRIPT:{i}:{s}")
        print(f"OK:BOOT:SCRIPT:COUNT:{len(boot_script)}")
        return True
    
    if cmd == "STATE:SAVE":
        save_state()
        return True
    
    if cmd == "STATE:LOAD":
        if load_state():
            apply_mode(current_mode)
            print("OK:STATE:LOADED")
        else:
            print("ERR:STATE:LOADED:FAILED")
        return True

    if cmd == "LED:StatusLED:ON":
        led_StatusLED.value(1)
        print("OK:LED:StatusLED:ON")
        return True
    if cmd == "LED:StatusLED:OFF":
        led_StatusLED.value(0)
        print("OK:LED:StatusLED:OFF")
        return True
    if cmd == "LED:StatusLED:TOGGLE":
        led_StatusLED.value(1 - led_StatusLED.value())
        print(f"OK:LED:StatusLED:{led_StatusLED.value()}")
        return True

    return False

# ============ INIT ============
print(f"SYS:READY:{DEVICE_TYPE}")

# Load saved state
if load_state():
    print(f"SYS:STATE:LOADED:MODE={current_mode}")
    
# Apply boot profile
if boot_mode == "LAST_STATE":
    apply_mode(current_mode)
elif boot_mode == "SAFE":
    apply_mode("POWER_SAVE")
    print("SYS:BOOT:SAFE_MODE")
elif boot_mode == "SCRIPT":
    print(f"SYS:BOOT:SCRIPT:RUNNING:{len(boot_script)} commands")
    for cmd in boot_script:
        handle_command(cmd)



# ============ MAIN LOOP ============
loop_delay = 0.016  # Default ~60 FPS
loop_time = 0.0     # Measured loop execution time (for CPU stats)
while True:
    loop_start = time.ticks_ms()
    
    cmd = read_input()
    if cmd:
        if not handle_command(cmd):
            print("ERR:UNKNOWN_CMD")
    
    # Adjust loop delay based on mode
    cfg = MODE_CONFIG.get(current_mode, MODE_CONFIG["AMBIENT"])
    loop_delay = 1.0 / cfg["fps"]


    
    # Measure loop time for CPU stats
    loop_time = time.ticks_diff(time.ticks_ms(), loop_start) / 1000.0
    
    # Sleep remaining time
    sleep_time = max(0, loop_delay - loop_time)
    time.sleep(sleep_time)
