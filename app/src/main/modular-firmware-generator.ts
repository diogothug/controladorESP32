/**
 * Modular Firmware Generator
 * Composes firmware from base + module snippets
 */

import { ModuleConfig, FirmwareIntent } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

// Module snippet structure
interface ModuleSnippet {
    imports: string;
    globals: string;
    commands: string;
    init: string;
    loop: string;
    caps: string[];
}

// Module type to snippet mapping
const MODULE_SNIPPETS: Record<string, (config: ModuleConfig, intent: FirmwareIntent) => ModuleSnippet> = {
    'LED': generateLedSnippet,
    'NEOPIXEL': generateNeopixelSnippet,
    'TEMP_SENSOR': generateTempSensorSnippet,
    'RELAY': generateRelaySnippet,
    'PWM': generatePwmSnippet,
    'ADC': generateAdcSnippet,
    'WIFI': generateWifiSnippet,
    'CLOCK': generateClockSnippet,
    'TIDE': generateTideSnippet,
    // Input modules
    'BUTTON': generateButtonSnippet,
    'ENCODER': generateEncoderSnippet,
    'PIR': generatePirSnippet,
    'LDR': generateLdrSnippet,
    'MIC': generateMicSnippet,
    'WEB_SERVER': generateWebServerSnippet,
    'MQTT': generateMqttSnippet,
    'OTA': generateOtaSnippet,
    'UDP': generateUdpSnippet,
    'ESPNOW': generateEspNowSnippet,
    'BLE': generateBleSnippet,
    'DISPLAY': generateDisplaySnippet,
    'NVS': generateNvsSnippet,
    'AUTOMATION': generateAutomationSnippet,
    'MODE': generateModeSnippet,
    'TELEMETRY': generateTelemetrySnippet,
    'AUDIO': generateAudioSnippet,
};

// ============ ESP32 MicroPython Generator ============

export function generateModularMicroPython(intent: FirmwareIntent): string {
    const modules = intent.modules;
    console.log(`[Backend-FW-Gen] Generating firmware for ${modules.length} modules... Intent: ${intent.appName}`);

    // Collect snippets from all modules
    const snippets = modules.map(mod => {
        const generator = MODULE_SNIPPETS[mod.type];
        if (generator) {
            console.log(`[Backend-FW-Gen] Generating snippet for module: ${mod.name} (${mod.type})`);
            return generator(mod, intent);
        }
        console.warn(`[Backend-FW-Gen] No generator found for module type: ${mod.type}`);
        return null;
    }).filter(s => s !== null) as ModuleSnippet[];

    console.log(`[Backend-FW-Gen] Collected ${snippets.length} snippets.`);

    // Combine all parts
    const imports = snippets.map(s => s.imports).filter(Boolean).join('\n');
    const globals = snippets.map(s => s.globals).filter(Boolean).join('\n');
    const commands = snippets.map(s => s.commands).filter(Boolean).join('\n\n');
    const init = snippets.map(s => s.init).filter(Boolean).join('\n');
    const loop = snippets.map(s => s.loop).filter(Boolean).join('\n');
    const caps = ['GPIO', ...snippets.flatMap(s => s.caps)];
    const moduleNames = modules.map(m => m.name);

    // Generate firmware
    return `# ESP32 MicroPython - Generated Firmware
# Modules: ${moduleNames.join(', ') || 'none'}
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

${imports}

# ============ CONFIG ============
# ============ CONFIG ============
FIRMWARE_VERSION = "3.1.0"
DEVICE_TYPE = "ESP32_GEN"
MODULES = ${JSON.stringify(moduleNames)}
CAPS = ${JSON.stringify(caps)}

# ============ INTENT (Premium) ============
# The universe this firmware believes it lives in.
INTENT = {
    "app_name": "${intent.appName}",
    "version": "${intent.semanticVersion}",
    "modules": ${JSON.stringify(moduleNames)},
    "generated_by": "${intent.meta?.generatedBy || 'Antigravity'}"
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
            f.write(f"{time.time()}:{reason}\\n")
    except Exception:
        pass

# ============ GLOBALS ============
${globals}

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

${commands}

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

${init}

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

${loop}
    
    # Measure loop time for CPU stats
    loop_time = time.ticks_diff(time.ticks_ms(), loop_start) / 1000.0
    
    # Sleep remaining time
    sleep_time = max(0, loop_delay - loop_time)
    time.sleep(sleep_time)
`;
}

// ============ Module Snippet Generators ============

function generateLedSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;

    return {
        imports: '',
        globals: `led_${name} = machine.Pin(${pin}, machine.Pin.OUT)\nled_${name}.value(0)`,
        commands: `    if cmd == "LED:${name}:ON":
        led_${name}.value(1)
        print("OK:LED:${name}:ON")
        return True
    if cmd == "LED:${name}:OFF":
        led_${name}.value(0)
        print("OK:LED:${name}:OFF")
        return True
    if cmd == "LED:${name}:TOGGLE":
        led_${name}.value(1 - led_${name}.value())
        print(f"OK:LED:${name}:{led_${name}.value()}")
        return True`,
        init: '',
        loop: '',
        caps: ['LED']
    };
}

function generateNeopixelSnippet(config: ModuleConfig, intent: FirmwareIntent): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;
    const count = config.neoPixelConfig?.pixelCount || 64;
    const initialBright = (config.neoPixelConfig?.brightness || 12) / 100;

    // Priority: Intent Boot Config > Module Default > NONE
    let defaultAnim = 'NONE';
    if (intent?.experience?.bootAnimation && intent.experience.bootAnimation !== 'NONE') {
        defaultAnim = intent.experience.bootAnimation;
    } else {
        defaultAnim = config.neoPixelConfig?.defaultAnimation || 'NONE';
    }

    // Matrix dimensions for 2D effects (Tide)
    const matrixWidth = config.neoPixelConfig?.matrixWidth || (count >= 64 ? 8 : count);
    const matrixHeight = Math.ceil(count / matrixWidth);

    // Smooth transition steps
    let transitionStep = 0.01; // MEDIUM
    const speed = config.neoPixelConfig?.transitionSpeed || 'MEDIUM';
    if (speed === 'SLOW') transitionStep = 0.002;
    if (speed === 'FAST') transitionStep = 0.04;
    if (speed === 'INSTANT') transitionStep = 1.0;

    const snippet: ModuleSnippet = {
        imports: 'import neopixel\nimport math\nimport random\nimport time',
        globals: `
np_${name} = neopixel.NeoPixel(machine.Pin(${pin}), ${count})
BRIGHTNESS_${name} = ${initialBright}
TARGET_BRIGHTNESS_${name} = ${initialBright}
curr_bright_${name} = ${initialBright}
TRANSITION_STEP_${name} = ${transitionStep}
current_anim_${name} = "${defaultAnim}"
anim_time_${name} = 0.0

# Matrix Config
NP_W_${name} = ${matrixWidth}
NP_H_${name} = ${matrixHeight}

# Standard Palettes
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

# Premium Tide Palettes
TIDE_COLOR_DEEP = (5, 15, 40)
TIDE_COLOR_LOW = (0, 40, 60)
TIDE_COLOR_MID = (0, 80, 120)
TIDE_COLOR_HIGH = (40, 140, 180)
TIDE_COLOR_PREAMAR = (80, 180, 200)

# Helper Functions (Idempotent)
def lerp_color(c1, c2, t):
    t = max(0, min(1, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t)
    )

def scale_color(color, factor):
    return (
        min(255, max(0, int(color[0] * factor))),
        min(255, max(0, int(color[1] * factor))),
        min(255, max(0, int(color[2] * factor)))
    )

def get_tide_depth_color(level, row, max_row):
    # Base color based on tide level
    if level >= 95: base = TIDE_COLOR_PREAMAR
    elif level >= 70: base = lerp_color(TIDE_COLOR_HIGH, TIDE_COLOR_PREAMAR, (level - 70) / 25)
    elif level >= 40: base = lerp_color(TIDE_COLOR_MID, TIDE_COLOR_HIGH, (level - 40) / 30)
    elif level >= 15: base = lerp_color(TIDE_COLOR_LOW, TIDE_COLOR_MID, (level - 15) / 25)
    else: base = lerp_color(TIDE_COLOR_DEEP, TIDE_COLOR_LOW, level / 15)
    
    # Depth gradient
    depth_factor = 0.5 + 0.5 * (row / max(1, max_row - 1))
    return scale_color(base, depth_factor)

# Fade control
fade_active_${name} = False
fade_target_${name} = 0.0

def apply_brightness_${name}(r, g, b):
    br = curr_bright_${name}
    return (int(r * br), int(g * br), int(b * br))
`,
        commands: `    if cmd == "NEO:${pin}:CLEAR":
        np_${name}.fill((0,0,0))
        np_${name}.write()
        print("OK:NEO:${pin}:CLEAR")
        return True
    if cmd.startswith("NEO:${pin}:ANIM:"):
        global current_anim_${name}, anim_time_${name}
        anim = cmd.split(":")[3]
        current_anim_${name} = anim
        anim_time_${name} = 0.0
        print(f"OK:NEO:${pin}:ANIM:{anim}")
        return True
    if cmd.startswith("NEO:${pin}:"):
        # Handle NEO:PIN:IDX:R,G,B for single pixel
        parts = cmd.split(":")
        if len(parts) >= 4:
            try:
                idx = int(parts[2])
                rgb = parts[3].split(",")
                r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
                np_${name}[idx] = (r, g, b)
                np_${name}.write()
                print(f"OK:NEO:${pin}:{idx}:{r},{g},{b}")
                return True
            except Exception:
                pass
    if cmd.startswith("BRIGHT:${pin}:"):
        global TARGET_BRIGHTNESS_${name}, fade_active_${name}
        val = int(cmd.split(":")[2])
        TARGET_BRIGHTNESS_${name} = val / 100.0
        fade_active_${name} = False
        print(f"OK:BRIGHT:${pin}:{val}")
        return True
`,
        init: `
    # Init NeoPixel ${name}
    np_${name}.fill((0,0,0))
    np_${name}.write()
`,
        loop: `
    # === NEOPIXEL ${name} LOOP ===
    # Auto-Brightness
    if 'BRIGHTNESS' in SHARED_DATA:
        TARGET_BRIGHTNESS_${name} = SHARED_DATA['BRIGHTNESS'] / 255.0

    # Smooth brightness transition
    if curr_bright_${name} != TARGET_BRIGHTNESS_${name}:
        diff = TARGET_BRIGHTNESS_${name} - curr_bright_${name}
        if abs(diff) < TRANSITION_STEP_${name}:
            curr_bright_${name} = TARGET_BRIGHTNESS_${name}
        else:
            curr_bright_${name} += TRANSITION_STEP_${name} if diff > 0 else -TRANSITION_STEP_${name}

    # Animations
    t_sec = time.ticks_ms() / 1000.0
    now_ms = time.ticks_ms()
    
    if current_anim_${name} == "RAINBOW":
        # FastLED Rainbow
        hue_base = int(t_sec * 50) % 255
        for i in range(${count}):
            hue = (hue_base + (i * 256 // ${count})) & 255
            rgb = color_from_palette(PALETTE_RAINBOW, hue)
            np_${name}[i] = apply_brightness_${name}(*rgb)
        np_${name}.write()
        
    elif current_anim_${name} == "FIRE":
        # FastLED Fire
        t_fire = t_sec * 0.5
        for i in range(${count}):
            h1 = sin8(int(i * 30 + t_fire * 255) & 255) 
            h2 = sin8(int(i * 10 - t_fire * 125) & 255)
            heat_index = qadd8(h1, h2)
            rgb = color_from_palette(PALETTE_FIRE, heat_index)
            np_${name}[i] = apply_brightness_${name}(*rgb)
        np_${name}.write()
        
    elif current_anim_${name} == "PLASMA":
        # FastLED Plasma
        phase1 = int(t_sec * 20)
        phase2 = int(t_sec * 15)
        for i in range(${count}):
            index = int(i * 255 // ${count})
            w1 = sin8((index + phase1) & 255)
            w2 = cos8((index + phase2) & 255)
            w3 = sin8((index + phase1 + phase2) & 255)
            color_index = (w1 + w2 + w3) // 3
            rgb = color_from_palette(PALETTE_OCEAN, color_index)
            np_${name}[i] = apply_brightness_${name}(*rgb)
        np_${name}.write()

    elif current_anim_${name} == "TIDE":
        # Premium Tide Rendering
        level = SHARED_DATA.get("TIDE", 50)
        direction = SHARED_DATA.get("TIDE_DIR", "rising")
        
        tide_phase = (now_ms % 8000) / 8000.0 * 2 * math.pi
        water_rows = int(NP_H_${name} * level / 100)
        
        # Preamar (High)
        if level >= 95:
            wave_phase = (now_ms % 6000) / 6000.0 * 2 * math.pi
            for y in range(NP_H_${name}):
                for x in range(NP_W_${name}):
                    idx = y * NP_W_${name} + x
                    if idx >= ${count}: continue
                    wave = 0.8 + 0.2 * math.sin(wave_phase + x * 0.6)
                    r = int(TIDE_COLOR_PREAMAR[0] * wave)
                    g = int(TIDE_COLOR_PREAMAR[1] * wave)
                    b = min(255, int(TIDE_COLOR_PREAMAR[2] * (wave + 0.1)))
                    np_${name}[idx] = apply_brightness_${name}(r,g,b)

        # Baixamar (Low)
        elif level <= 10:
            pulse_phase = (now_ms % 4000) / 4000.0 * 2 * math.pi
            pulse = 0.3 + 0.7 * (0.5 + 0.5 * math.sin(pulse_phase))
            lit_rows = max(1, int(NP_H_${name} * level / 100))
            for y in range(NP_H_${name}):
                for x in range(NP_W_${name}):
                    idx = y * NP_W_${name} + x
                    if idx >= ${count}: continue
                    if y < lit_rows:
                        c = scale_color(TIDE_COLOR_LOW, pulse * 0.6)
                        np_${name}[idx] = apply_brightness_${name}(*c)
                    else:
                        np_${name}[idx] = (0,0,0)
        
        # Normal Tide
        else:
            for y in range(NP_H_${name}):
                for x in range(NP_W_${name}):
                    idx = y * NP_W_${name} + x
                    if idx >= ${count}: continue
                    
                    if y < water_rows:
                        color = get_tide_depth_color(level, y, water_rows)
                        if direction == "rising":
                            wave = math.sin(tide_phase - y * 0.8)
                        elif direction == "falling":
                            wave = math.sin(tide_phase + y * 0.8)
                        else:
                            wave = math.sin(tide_phase * 0.3 + x * 0.5)
                        
                        b_wave = 0.4 + 0.6 * (0.5 + 0.5 * wave)
                        color = scale_color(color, b_wave)
                        
                        if wave > 0.6:
                            peak = (wave - 0.6) / 0.4
                            color = (min(255, color[0] + int(40*peak)), 
                                     min(255, color[1] + int(60*peak)), 
                                     min(255, color[2] + int(80*peak)))
                        np_${name}[idx] = apply_brightness_${name}(*color)
                    else:
                        c = scale_color(TIDE_COLOR_DEEP, 0.02)
                        np_${name}[idx] = apply_brightness_${name}(*c)
        
        np_${name}.write()


    elif current_anim_${name} == "TIDE_SIMPLE":
        # Simple Bar Chart
        level = SHARED_DATA.get("TIDE", 50)
        water_rows = int(NP_H_${name} * level / 100)
        c_water = apply_brightness_${name}(*TIDE_COLOR_MID)
        c_empty = apply_brightness_${name}(0, 0, 0)
        
        for y in range(NP_H_${name}):
            for x in range(NP_W_${name}):
                idx = y * NP_W_${name} + x
                if idx >= ${count}: continue
                np_${name}[idx] = c_water if y < water_rows else c_empty
        np_${name}.write()

    elif current_anim_${name} == "TIDE_WAVE":
        # Dynamic Wave (Physics based)
        level = SHARED_DATA.get("TIDE", 50)
        tide_phase = (now_ms % 2000) / 2000.0 * 2 * math.pi
        water_rows = int(NP_H_${name} * level / 100)
        
        for y in range(NP_H_${name}):
            for x in range(NP_W_${name}):
                idx = y * NP_W_${name} + x
                if idx >= ${count}: continue
                
                # Wave height varies by X
                wave_h = math.sin(tide_phase + x * 0.5) * 1.5
                effective_h = water_rows + wave_h
                
                if y < effective_h:
                    depth_f = y / max(1, effective_h)
                    c = scale_color(TIDE_COLOR_HIGH, 0.5 + 0.5*depth_f)
                    np_${name}[idx] = apply_brightness_${name}(*c)
                else:
                    np_${name}[idx] = (0,0,0)
        np_${name}.write()

    elif current_anim_${name} == "TIDE_AURORA":
        # Borealis effect masked by Tide
        level = SHARED_DATA.get("TIDE", 50)
        water_rows = int(NP_H_${name} * level / 100)
        phase = (now_ms % 5000) / 5000.0 * 255
        phase_low = int(now_ms / 20) % 255
        
        for y in range(NP_H_${name}):
            if y >= water_rows:
                # Top is black/sky
                for x in range(NP_W_${name}):
                    idx = y * NP_W_${name} + x
                    if idx < ${count}: np_${name}[idx] = (0,0,0)
                continue
                
            # Water reflects Aurora
            for x in range(NP_W_${name}):
                idx = y * NP_W_${name} + x
                if idx >= ${count}: continue
                
                # Plasma-ish color
                idx_p = int(x * 10 + y * 10 + phase_low) & 255
                w1 = sin8(idx_p)
                w2 = cos8((idx_p + 50) & 255)
                color_idx = (w1 + w2) // 2
                
                # Ocean Palette + Greenish tint
                base = color_from_palette(PALETTE_OCEAN, color_idx)
                # Mix with Green (Aurora)
                aurora = (0, 255, 100)
                mist = 0.3 * (y / max(1, water_rows))
                
                final_c = lerp_color(base, aurora, mist)
                np_${name}[idx] = apply_brightness_${name}(*final_c)
        np_${name}.write()

    elif current_anim_${name} == "CUSTOM":
        # Custom Frame Animation Playback
        if 'CUSTOM_FRAMES_${name}' in globals() and len(CUSTOM_FRAMES_${name}) > 0:
            frame_count = len(CUSTOM_FRAMES_${name})
            frame_idx = (now_ms // CUSTOM_DELAY_${name}) % frame_count
            frame = CUSTOM_FRAMES_${name}[frame_idx]
            for i in range(min(${count}, len(frame))):
                rgb = frame[i]
                # Unpack RGB from 0xRRGGBB format
                r = (rgb >> 16) & 0xFF
                g = (rgb >> 8) & 0xFF
                b = rgb & 0xFF
                np_${name}[i] = apply_brightness_${name}(r, g, b)
            np_${name}.write()
`,
        caps: ['LED']
    };

    // If custom animation data is present, inject frame data into globals
    if (config.neoPixelConfig?.customAnimation && config.neoPixelConfig.defaultAnimation === 'CUSTOM') {
        const customAnim = config.neoPixelConfig.customAnimation;
        const framesStr = customAnim.frames.map(frame =>
            '[' + frame.join(', ') + ']'
        ).join(',\n    ');

        snippet.globals += `
# Custom Animation: ${customAnim.name}
CUSTOM_FRAMES_${name} = [
    ${framesStr}
]
CUSTOM_DELAY_${name} = ${customAnim.frameDelayMs}
CUSTOM_LOOP_${name} = ${customAnim.loop ? 'True' : 'False'}
`;
    }

    return snippet;
}

function generateTempSensorSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;
    // DHT11 or DHT22
    const sensorType = config.sensorConfig?.type || 'DHT11';
    const dhtClass = sensorType === 'DHT22' ? 'DHT22' : 'DHT11';

    return {
        imports: 'import dht',
        globals: `temp_${name} = dht.${dhtClass}(machine.Pin(${pin})) \nlast_temp_${name} = 0.0\nlast_humid_${name} = 0.0`,
        commands: `    if cmd == "TEMP:${name}:READ":
        try:
            temp_${name}.measure()
            last_temp_${name} = temp_${name}.temperature()
            last_humid_${name} = temp_${name}.humidity()
            dispatch_event(f"TEMP:${name}:UPDATE:{last_temp_${name}}:{last_humid_${name}}")
            print(f"OK:TEMP:${name}:{last_temp_${name}}C:{last_humid_${name}}%")
        except Exception as e:
            print(f"ERR:TEMP:${name}:{e}")
        return True`,
        init: `# Init temp sensor ${name}
try:
    temp_${name}.measure()
    last_temp_${name} = temp_${name}.temperature()
    last_humid_${name} = temp_${name}.humidity()
except Exception:
    pass`,
        loop: '',
        caps: ['TEMP']
    };
}

function generateRelaySnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;

    return {
        imports: '',
        globals: `relay_${name} = machine.Pin(${pin}, machine.Pin.OUT) \nrelay_${name}.value(0)`,
        commands: `    if cmd == "RELAY:${name}:ON":
        relay_${name}.value(1)
        print("OK:RELAY:${name}:ON")
        return True
    if cmd == "RELAY:${name}:OFF":
        relay_${name}.value(0)
        print("OK:RELAY:${name}:OFF")
        return True
    if cmd == "RELAY:${name}:STATUS":
        print(f"OK:RELAY:${name}:{relay_${name}.value()}")
        return True`,
        init: '',
        loop: '',
        caps: ['RELAY']
    };
}

function generatePwmSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;

    return {
        imports: '',
        globals: `pwm_${name} = machine.PWM(machine.Pin(${pin})) \npwm_${name}.freq(1000)`,
        commands: `    if cmd.startswith("PWM:${name}:"):
    parts = cmd.split(":")
if len(parts) >= 3:
    duty = int(parts[2])
            pwm_${name}.duty(duty)
print(f"OK:PWM:${name}:{duty}")
return True`,
        init: '',
        loop: '',
        caps: ['PWM']
    };
}

function generateAdcSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin;

    return {
        imports: '',
        globals: `adc_${name} = machine.ADC(machine.Pin(${pin})) \nadc_${name}.atten(machine.ADC.ATTN_11DB)`,
        commands: `    if cmd == "ADC:${name}:READ":
    val = adc_${name}.read()
voltage = val * 3.3 / 4095
print(f"OK:ADC:${name}:{val}:{voltage:.2f}V")
return True`,
        init: '',
        loop: '',
        caps: ['ADC']
    };
}

// ============ INPUT MODULES ============

function generateButtonSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin || 0;
    const pullup = config.options?.pullup !== false;
    const debounceMs = config.options?.debounce || 50;

    return {
        imports: '',
        globals: `# Button ${name}
btn_${name} = machine.Pin(${pin}, machine.Pin.IN, machine.Pin.${pullup ? 'PULL_UP' : 'PULL_DOWN'})
btn_${name} _last = 0
btn_${name} _state = ${pullup ? '1' : '0'}
btn_${name} _pressed = False
btn_${name} _count = 0`,
        commands: `    if cmd == "BTN:${name}:READ":
    val = btn_${name}.value()
print(f"OK:BTN:${name}:{val}")
return True

if cmd == "BTN:${name}:STATE":
    print(f"OK:BTN:${name}:PRESSED={btn_${name}_pressed};COUNT={btn_${name}_count}")
return True

if cmd == "BTN:${name}:RESET":
    global btn_${name} _count
        btn_${name} _count = 0
print(f"OK:BTN:${name}:RESET")
return True`,
        init: `# Init button ${name}
btn_${name} _last = time.ticks_ms()`,
        loop: `# Button ${name} debounce
if time.ticks_diff(time.ticks_ms(), btn_${name}_last) > ${debounceMs}:
new_state = btn_${name}.value()
if new_state != btn_${name} _state:
        btn_${name} _state = new_state
        btn_${name} _last = time.ticks_ms()
if new_state == ${pullup ? '0' : '1'}:
            btn_${name} _pressed = True
            btn_${name} _count += 1
            dispatch_event(f"BTN:${name}:PRESS:{btn_${name}_count}")
        else:
            btn_${name} _pressed = False
            dispatch_event(f"BTN:${name}:RELEASE")`,
        caps: ['BUTTON', 'INPUT']
    };
}

function generateEncoderSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pinA = config.pin || 0;
    const pinB = config.options?.pinB || (config.pin ? config.pin + 1 : 1);
    const pinBtn = config.options?.pinBtn;

    let btnGlobals = '';
    let btnCommands = '';
    let btnLoop = '';

    if (pinBtn !== undefined) {
        btnGlobals = `
enc_${name} _btn = machine.Pin(${pinBtn}, machine.Pin.IN, machine.Pin.PULL_UP)
enc_${name} _btn_last = 0`;
        btnCommands = `
if cmd == "ENC:${name}:BTN":
    val = enc_${name} _btn.value()
print(f"OK:ENC:${name}:BTN:{1 - val}")
return True`;
        btnLoop = `
# Encoder ${name} button
if time.ticks_diff(time.ticks_ms(), enc_${name}_btn_last) > 50:
    if enc_${name} _btn.value() == 0:
        enc_${name} _btn_last = time.ticks_ms()
        dispatch_event(f"ENC:${name}:BTN:PRESS")`;
    }

    return {
        imports: '',
        globals: `# Encoder ${name}
enc_${name} _a = machine.Pin(${pinA}, machine.Pin.IN, machine.Pin.PULL_UP)
enc_${name} _b = machine.Pin(${pinB}, machine.Pin.IN, machine.Pin.PULL_UP)
enc_${name} _pos = 0
enc_${name} _last_a = 0${btnGlobals} `,
        commands: `    if cmd == "ENC:${name}:READ":
    print(f"OK:ENC:${name}:{enc_${name}_pos}")
return True

if cmd == "ENC:${name}:RESET":
    global enc_${name} _pos
        enc_${name} _pos = 0
print(f"OK:ENC:${name}:RESET")
return True

if cmd.startswith("ENC:${name}:SET:"):
    global enc_${name} _pos
val = int(cmd.split(":")[-1])
        enc_${name} _pos = val
print(f"OK:ENC:${name}:SET:{val}")
return True${btnCommands} `,
        init: `# Init encoder ${name}
enc_${name} _last_a = enc_${name} _a.value()`,
        loop: `# Encoder ${name} read
a_new = enc_${name} _a.value()
if a_new != enc_${name} _last_a:
    enc_${name} _last_a = a_new
if a_new == 0:
        if enc_${name} _b.value() == 0:
            enc_${name} _pos += 1
            dispatch_event(f"ENC:${name}:CW:{enc_${name}_pos}")
        else:
            enc_${name} _pos -= 1
            dispatch_event(f"ENC:${name}:CCW:{enc_${name}_pos}")${btnLoop} `,
        caps: ['ENCODER', 'INPUT']
    };
}

function generatePirSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin || 0;
    const cooldownMs = config.options?.cooldown || 2000;

    return {
        imports: '',
        globals: `# PIR Sensor ${name}
pir_${name} = machine.Pin(${pin}, machine.Pin.IN)
pir_${name} _state = 0
pir_${name} _last_motion = 0
pir_${name} _motion_count = 0`,
        commands: `    if cmd == "PIR:${name}:READ":
    val = pir_${name}.value()
print(f"OK:PIR:${name}:{val}")
return True

if cmd == "PIR:${name}:STATE":
    print(f"OK:PIR:${name}:MOTION={pir_${name}_state};COUNT={pir_${name}_motion_count}")
return True

if cmd == "PIR:${name}:RESET":
    global pir_${name} _motion_count
        pir_${name} _motion_count = 0
print(f"OK:PIR:${name}:RESET")
return True`,
        init: `# Init PIR ${name}
pir_${name} _state = pir_${name}.value()`,
        loop: `# PIR ${name} motion detection
pir_new = pir_${name}.value()
if pir_new == 1 and pir_${name} _state == 0:
if time.ticks_diff(time.ticks_ms(), pir_${name}_last_motion) > ${cooldownMs}:
        pir_${name} _last_motion = time.ticks_ms()
        pir_${name} _motion_count += 1
        dispatch_event(f"PIR:${name}:MOTION:{pir_${name}_motion_count}")
pir_${name} _state = pir_new`,
        caps: ['PIR', 'INPUT', 'MOTION']
    };
}

function generateLdrSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin || 34; // Default to input-only pin
    const interval = config.ldrConfig?.interval || config.options?.interval || 1000;
    const minRead = config.ldrConfig?.minReading || 500;
    const maxRead = config.ldrConfig?.maxReading || 4095;
    const minBright = config.ldrConfig?.minBrightness || 10;
    const maxBright = config.ldrConfig?.maxBrightness || 255;

    return {
        imports: 'from machine import ADC',
        globals: `
# LDR ${name}
ldr_${name} = ADC(machine.Pin(${pin}))
ldr_${name}.atten(ADC.ATTN_11DB)
ldr_${name}_last = 0
ldr_${name}_val = 0
ldr_${name}_sent = 0
`,
        commands: `    if cmd == "LDR:${name}:READ":
        print(f"OK:LDR:${name}:{ldr_${name}.read()}")
        return True`,
        init: '',
        loop: `
    # LDR Update
    if time.ticks_diff(time.ticks_ms(), ldr_${name}_last) > ${interval}:
        ldr_${name}_last = time.ticks_ms()
        raw = ldr_${name}.read()
        # Map raw ${minRead}-${maxRead} to ${minBright}-${maxBright}
        val = max(${minRead}, min(${maxRead}, raw))
        norm = (val - ${minRead}) / (${maxRead} - ${minRead})
        bright = int(${minBright} + norm * (${maxBright} - ${minBright}))
        SHARED_DATA['BRIGHTNESS'] = bright
        if abs(bright - ldr_${name}_sent) > 5:
            ldr_${name}_sent = bright
            dispatch_event(f"LDR:${name}:CHANGE:{bright}")
`,
        caps: ['LDR']
    };
}

function generateMicSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = config.pin || 35;
    const threshold = config.options?.threshold || 2500;
    const sampleCount = config.options?.samples || 32;

    return {
        imports: '',
        globals: `# Microphone ${name}
mic_${name} = machine.ADC(machine.Pin(${pin}))
mic_${name}.atten(machine.ADC.ATTN_11DB)
mic_${name} _peak = 0
mic_${name} _triggered = False`,
        commands: `    if cmd == "MIC:${name}:READ":
        # Sample and get peak - to - peak
min_val = 4095
max_val = 0
for _ in range(${sampleCount}):
    val = mic_${name}.read()
if val < min_val:
    min_val = val
if val > max_val:
    max_val = val
pp = max_val - min_val
print(f"OK:MIC:${name}:{pp}:{min_val}:{max_val}")
return True

if cmd == "MIC:${name}:LEVEL":
        # Get current RMS - like level
total = 0
for _ in range(${sampleCount}):
    val = mic_${name}.read() - 2048
total += val * val
rms = int((total / ${sampleCount}) ** 0.5)
print(f"OK:MIC:${name}:LEVEL:{rms}")
return True

if cmd == "MIC:${name}:PEAK":
    print(f"OK:MIC:${name}:PEAK:{mic_${name}_peak}")
        mic_${name} _peak = 0
return True`,
        init: '',
        loop: `# Mic ${name} peak detection
mic_val = mic_${name}.read()
if mic_val > mic_${name} _peak:
    mic_${name} _peak = mic_val
if mic_val > ${threshold} and not mic_${name} _triggered:
    mic_${name} _triggered = True
    dispatch_event(f"MIC:${name}:LOUD:{mic_val}")
elif mic_val < ${threshold - 500}:
    mic_${name} _triggered = False`,
        caps: ['MIC', 'INPUT', 'SOUND', 'ADC']
    };
}

// ============ Recovery Firmware// === WIFI MODULE ===
function generateWifiSnippet(config: ModuleConfig): ModuleSnippet {
    return {
        imports: 'import network\nimport socket\nimport struct\nimport binascii\nimport hashlib',
        globals: `
# ============ GLOBALS ============
wifi_sta = network.WLAN(network.STA_IF)
wifi_ap = network.WLAN(network.AP_IF)
wifi_manual_connect = False
ws_clients = []
ws_server = None
mdns_sock = None
HOSTNAME = "led-device"
`,
        commands: `    if cmd.startswith("WIFI:CONNECT:"):
        try:
            parts = cmd.split(":")
            ssid = parts[2]
            password = parts[3] if len(parts) > 3 else ""
            
            wifi_sta.active(True)
            wifi_sta.connect(ssid, password)
            wifi_manual_connect = True
            
            print(f"OK:WIFI:CONNECTING:{ssid}")
            return True
        except Exception as e:
            print(f"ERR:WIFI:CONNECT:{e}")
            return True

    if cmd.startswith("WIFI:AP:"):
        try:
            parts = cmd.split(":")
            ssid = parts[2]
            password = parts[3] if len(parts) > 3 else ""
            
            wifi_ap.active(True)
            if password:
                wifi_ap.config(essid=ssid, password=password, authmode=3)
            else:
                wifi_ap.config(essid=ssid, authmode=0)
            
            print(f"OK:WIFI:AP:CREATED:{ssid}:{wifi_ap.ifconfig()[0]}")
            setup_servers(wifi_ap.ifconfig()[0])
            return True
        except Exception as e:
            print(f"ERR:WIFI:AP:{e}")
            return True

    if cmd == "WIFI:STATUS":
        status = "DISCONNECTED"
        ip = "0.0.0.0"
        if wifi_sta.isconnected():
            status = "CONNECTED"
            ip = wifi_sta.ifconfig()[0]
            if not ws_server:
                setup_servers(ip)
        elif wifi_ap.active():
            status = "AP_MODE"
            ip = wifi_ap.ifconfig()[0]
        
        rssi = wifi_sta.status('rssi') if wifi_sta.isconnected() else 0
        print(f"OK:WIFI:STATUS:{status}:{ip}:{rssi}")
        return True

    if cmd.startswith("WIFI:MDNS:"):
        global HOSTNAME
        HOSTNAME = cmd.split(":")[2]
        print(f"OK:WIFI:MDNS:{HOSTNAME}")
        return True

    if cmd == "WIFI:SCAN":
        try:
            wifi_sta.active(True)
            nets = wifi_sta.scan()
            results = []
            for n in nets:
                ssid = n[0].decode('utf-8')
                if ssid:
                    results.append(f"{ssid},{n[3]}")
            
            print(f"OK:WIFI:SCAN:{';'.join(results)}")
            return True
        except Exception as e:
            print(f"ERR:WIFI:SCAN:{e}")
            return True`,
        init: `
# Initialize WiFi
HOSTNAME = "${config.wifiConfig?.hostname || 'led-device'}"
try:
    if "${config.wifiConfig?.mode}" == "STA":
        ssid = "${config.wifiConfig?.ssid || ''}"
        password = "${config.wifiConfig?.password || ''}"
        if ssid:
            wifi_sta.active(True)
            wifi_sta.connect(ssid, password)
            print(f"SYS:WIFI:CONNECTING:{ssid}")
    elif "${config.wifiConfig?.mode}" == "AP":
        ssid = "${config.wifiConfig?.ssid || 'ESP32-AP'}"
        password = "${config.wifiConfig?.password || ''}"
        wifi_ap.active(True)
        if password:
            wifi_ap.config(essid=ssid, password=password, authmode=3)
        else:
            wifi_ap.config(essid=ssid, authmode=0)
        print(f"SYS:WIFI:AP_CREATED:{ssid}")
        setup_servers(wifi_ap.ifconfig()[0])
except Exception as e:
    print(f"ERR:WIFI:INIT:{e}")


def setup_servers(ip):
    global ws_server, mdns_sock
    
    # WebSocket Server on port 81
    try:
        if not ws_server:
            ws_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            ws_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            ws_server.bind(('0.0.0.0', 81))
            ws_server.listen(4)
            ws_server.setblocking(False)
            print("SYS:WS:STARTED:81")
    except Exception as e:
        print(f"ERR:WS:START:{e}")

    # mDNS Responder on UDP 5353
    try:
        if not mdns_sock:
            mdns_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            mdns_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            mdns_sock.bind(('0.0.0.0', 5353))
            mdns_sock.setblocking(False)
            
            # Join Multicast Group
            mreq = struct.pack("4sl", socket.inet_aton("224.0.0.251"), socket.INADDR_ANY)
            mdns_sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
            print(f"SYS:MDNS:STARTED:{HOSTNAME}.local")
    except Exception as e:
        print(f"ERR:MDNS:START:{e}")

def ws_handshake(client):
    try:
        req = client.recv(1024)
        if not req: return False

        headers = {}
        for line in req.decode().split("\\r\\n"):
            if ": " in line:
                k, v = line.split(": ", 1)
                headers[k] = v
        
        if "Sec-WebSocket-Key" in headers:
            key = headers["Sec-WebSocket-Key"]
            resp_key = binascii.b2a_base64(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode().strip()
            
            resp = "HTTP/1.1 101 Switching Protocols\\r\\n"
            resp += "Upgrade: websocket\\r\\n"
            resp += "Connection: Upgrade\\r\\n"
            resp += f"Sec-WebSocket-Accept: {resp_key}\\r\\n\\r\\n"
            
            client.send(resp.encode())
            return True
    except Exception:
        pass
    return False

def ws_read_frame(client):
    try:
        h = client.recv(2)
        if not h: return None

        length = h[1] & 127
        if length == 126:
            length = struct.unpack(">H", client.recv(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", client.recv(8))[0]
        
        masks = client.recv(4)
        payload = client.recv(length)
        
        decoded = bytearray()
        for i in range(length):
            decoded.append(payload[i] ^ masks[i % 4])
        
        return decoded.decode()
    except Exception:
        return None
    `,
        loop: `
    # Manage WiFi State + Auto NTP Sync
    if wifi_sta.isconnected() and not ws_server:
        # Sync NTP first (priority!)
        try:
            import ntptime
            print("SYS:NTP:SYNCING...")
            ntptime.settime()
            import time
            now = time.localtime()
            print(f"SYS:NTP:SYNCED:{now[0]}-{now[1]:02d}-{now[2]:02d} {now[3]:02d}:{now[4]:02d}")
        except Exception as e:
            print(f"ERR:NTP:AUTO:{e}")
        # Then setup servers
        setup_servers(wifi_sta.ifconfig()[0])

    # WebSocket Accept
    if ws_server:
        try:
            cl, addr = ws_server.accept()
            # Handshake
            cl.settimeout(1.0)
            if ws_handshake(cl):
                cl.setblocking(False)
                ws_clients.append(cl)
                print(f"SYS:WS:CLIENT_CONNECTED:{addr[0]}")
            else:
                cl.close()
        except OSError:
            pass

    # WebSocket Read
    for cl in ws_clients[:]:
        try:
            msg = ws_read_frame(cl)
            if msg:
                handle_command(msg)
        except Exception:
            try:
                ws_clients.remove(cl)
            except Exception: pass
    `,
        caps: ['WIFI', 'WS', 'MDNS']
    };
}

function generateClockSnippet(config: ModuleConfig): ModuleSnippet {
    const clockConfig = config.clockConfig || {
        enabled: true,
        format24h: true,
        showDate: false,
        ntpServer: 'pool.ntp.org',
        tzOffset: -3,
        color: [255, 255, 255]
    };

    const r = clockConfig.color?.[0] || 255;
    const g = clockConfig.color?.[1] || 255;
    const b = clockConfig.color?.[2] || 255;

    return {
        imports: 'import ntptime',
        globals: `# Clock Configuration
clock_enabled = ${clockConfig.enabled ? 'True' : 'False'}
clock_format_24h = ${clockConfig.format24h ? 'True' : 'False'}
clock_show_date = ${clockConfig.showDate ? 'True' : 'False'}
clock_ntp_server = "${clockConfig.ntpServer}"
clock_tz_offset = ${clockConfig.tzOffset}
clock_color = (${r}, ${g}, ${b})
clock_last_sync = 0
clock_last_update = 0

# Simple 3x5 digit font(each digit is 3 wide, 5 tall)
CLOCK_FONT = {
    '0': [0b111, 0b101, 0b101, 0b101, 0b111],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b111, 0b001, 0b111, 0b100, 0b111],
    '3': [0b111, 0b001, 0b111, 0b001, 0b111],
    '4': [0b101, 0b101, 0b111, 0b001, 0b001],
    '5': [0b111, 0b100, 0b111, 0b001, 0b111],
    '6': [0b111, 0b100, 0b111, 0b101, 0b111],
    '7': [0b111, 0b001, 0b001, 0b001, 0b001],
    '8': [0b111, 0b101, 0b111, 0b101, 0b111],
    '9': [0b111, 0b101, 0b111, 0b001, 0b111],
    ':': [0b000, 0b010, 0b000, 0b010, 0b000],
    ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
    '/': [0b001, 0b001, 0b010, 0b100, 0b100],
}

def sync_ntp():
global clock_last_sync
try:
ntptime.host = clock_ntp_server
ntptime.settime()
clock_last_sync = time.time()
print("OK:CLOCK:NTP_SYNCED")
return True
    except Exception as e:
print(f"ERR:CLOCK:NTP:{e}")
return False

def render_clock_digit(np, digit, x_offset, y_offset, width, color):
if digit not in CLOCK_FONT:
return
pattern = CLOCK_FONT[digit]
for row in range(5):
    bits = pattern[row]
for col in range(3):
    if bits & (1 << (2 - col)):
        px = x_offset + col
py = y_offset + row
if 0 <= px < width and 0 <= py * width + px < len(np):
idx = py * width + px
np[idx] = color`,
        commands: `    if cmd == "CLOCK:SHOW":
    global clock_enabled
clock_enabled = True
print("OK:CLOCK:SHOW")
return True
if cmd == "CLOCK:HIDE":
    global clock_enabled
clock_enabled = False
print("OK:CLOCK:HIDE")
return True
if cmd == "CLOCK:FORMAT:12":
    global clock_format_24h
clock_format_24h = False
print("OK:CLOCK:FORMAT:12")
return True
if cmd == "CLOCK:FORMAT:24":
    global clock_format_24h
clock_format_24h = True
print("OK:CLOCK:FORMAT:24")
return True
if cmd == "CLOCK:DATE:ON":
    global clock_show_date
clock_show_date = True
print("OK:CLOCK:DATE:ON")
return True
if cmd == "CLOCK:DATE:OFF":
    global clock_show_date
clock_show_date = False
print("OK:CLOCK:DATE:OFF")
return True
if cmd.startswith("CLOCK:TZ:"):
    global clock_tz_offset
try:
clock_tz_offset = int(cmd.split(":")[2])
print(f"OK:CLOCK:TZ:{clock_tz_offset}")
except Exception:
print("ERR:CLOCK:TZ:INVALID")
return True
if cmd.startswith("CLOCK:NTP:"):
    global clock_ntp_server
clock_ntp_server = cmd.split(":")[2]
sync_ntp()
return True
if cmd == "CLOCK:SYNC":
    sync_ntp()
return True
if cmd == "CLOCK:STATUS":
    t = time.localtime(time.time() + clock_tz_offset * 3600)
print(f"OK:CLOCK:STATUS:ENABLED={clock_enabled};FORMAT={'24h' if clock_format_24h else '12h'};TZ={clock_tz_offset};TIME={t[3]:02}:{t[4]:02}:{t[5]:02}")
return True`,
        init: `# Clock Init
if wifi_sta.isconnected():
    sync_ntp()`,
        loop: `    # Clock Update Loop
if clock_enabled and time.time() - clock_last_update >= 1:
clock_last_update = time.time()
t = time.localtime(time.time() + clock_tz_offset * 3600)
hour = t[3]
minute = t[4]

if not clock_format_24h:
    hour = hour % 12
if hour == 0:
    hour = 12
        
        # Render time to first available NeoPixel matrix
        # This assumes a matrix width of 8 or more pixels
        # Format: HH: MM`,
        caps: ['CLOCK', 'NTP']
    };
}

// ============ TIDE Module ============

function generateTideSnippet(config: ModuleConfig): ModuleSnippet {
    const tideConfig = config.tideConfig || {
        enabled: true,
        harborId: 1,
        harborName: 'Porto',
        state: 'pb',
        updateInterval: 30,
        highTideColor: '#50B4C8',
        lowTideColor: '#00283C',
    };

    const harborId = tideConfig.harborId;
    const updateInterval = tideConfig.updateInterval * 60; // Convert to seconds



    return {
        imports: `import urequests
import json
import time`,
        globals: `# Premium Tide Logic Configuration
TIDE_HARBOR_ID = ${harborId}
TIDE_UPDATE_INTERVAL = ${updateInterval}
TIDE_API_BASE = "https://tabuamare.devtu.qzz.io/api/v1"

# Tide state variables
tide_enabled = True
tide_level = 50  # 0 - 100 percentage
tide_direction = "rising"  # "rising", "falling", or "stable"
tide_last_update = 0
tide_next_change = ""

def lerp_color(c1, c2, t):
"""Interpolate between two RGB colors"""
t = max(0, min(1, t))
return (
    int(c1[0] + (c2[0] - c1[0]) * t),
    int(c1[1] + (c2[1] - c1[1]) * t),
    int(c1[2] + (c2[2] - c1[2]) * t)
)

def apply_brightness(color, factor):
"""Apply brightness factor with clamping"""
return (
    min(255, max(0, int(color[0] * factor))),
    min(255, max(0, int(color[1] * factor))),
    min(255, max(0, int(color[2] * factor)))
)

def get_depth_color(level, row, max_row):
"""Get color based on tide level and vertical depth"""
    # Base color based on overall tide level
if level >= 95:
    base = TIDE_COLOR_PREAMAR
    elif level >= 70:
base = lerp_color(TIDE_COLOR_HIGH, TIDE_COLOR_PREAMAR, (level - 70) / 25)
    elif level >= 40:
base = lerp_color(TIDE_COLOR_MID, TIDE_COLOR_HIGH, (level - 40) / 30)
    elif level >= 15:
base = lerp_color(TIDE_COLOR_LOW, TIDE_COLOR_MID, (level - 15) / 25)
    else:
base = lerp_color(TIDE_COLOR_DEEP, TIDE_COLOR_LOW, level / 15)
    
    # Apply depth gradient: bottom darker, top lighter
depth_factor = 0.5 + 0.5 * (row / max(1, max_row - 1))
return apply_brightness(base, depth_factor)

def set_tide_enabled(val):
global tide_enabled
tide_enabled = val
    SHARED_DATA["TIDE_ENABLED"] = val

def set_tide_level(val_str):
global tide_level
try:
    tide_level = int(val_str)
    SHARED_DATA["TIDE"] = tide_level
    print(f"OK:TIDE:LEVEL:{tide_level}")
except Exception:
print("ERR:TIDE:LEVEL:INVALID")

def set_tide_direction(val_str):
global tide_direction
d = val_str.lower()
    if d in ("rising", "falling", "stable"):
        tide_direction = d
        SHARED_DATA["TIDE_DIR"] = tide_direction
        print(f"OK:TIDE:DIR:{tide_direction}")
    else:
print("ERR:TIDE:DIR:INVALID")

def parse_time(t_str):
"""Parse HH:MM string to minutes since midnight"""
try:
h, m = t_str.split(":")
return int(h) * 60 + int(m)
except Exception:
return 0

def fetch_tide_data():
global tide_level, tide_direction, tide_next_change, tide_last_update
try:
import time
        now = time.localtime()
month = now[1]
day = now[2]
current_mins = now[3] * 60 + now[4]

url = f"{TIDE_API_BASE}/tabua-mare/{TIDE_HARBOR_ID}/{month}/[{day}]"
response = urequests.get(url)
data = json.loads(response.text)
response.close()
        
        # Parse nested structure: data[0].months[0].days[0].hours[]
if data.get("data") and len(data["data"]) > 0:
harbor_data = data["data"][0]
months = harbor_data.get("months", [])
if months and len(months) > 0:
days = months[0].get("days", [])
if days and len(days) > 0:
hours = days[0].get("hours", [])
                    
                    # Sort by time
hours.sort(key = lambda e: parse_time(e.get("hour", "00:00:00")[: 5]))

prev_entry = None
next_entry = None

for entry in hours:
    hour_str = entry.get("hour", "00:00:00")[: 5]  # "HH:MM:SS" -> "HH:MM"
entry_time = parse_time(hour_str)
if entry_time <= current_mins:
    prev_entry = entry
                        elif next_entry is None:
next_entry = entry

if prev_entry and next_entry:
prev_time = parse_time(prev_entry.get("hour", "00:00:00")[: 5])
next_time = parse_time(next_entry.get("hour", "00:00:00")[: 5])
prev_height = float(prev_entry.get("level", 1))
next_height = float(next_entry.get("level", 1))

if next_time > prev_time:
    progress = (current_mins - prev_time) / (next_time - prev_time)
    current_height = prev_height + (next_height - prev_height) * progress
    mean_level = harbor_data.get("mean_level", 1.1)
    tide_level = min(100, max(0, int(current_height / (mean_level * 2) * 100)))
    SHARED_DATA["TIDE"] = tide_level

diff = next_height - prev_height
    if abs(diff) < 0.1:
        tide_direction = "stable"
    elif diff > 0:
        tide_direction = "rising"
    else:
        tide_direction = "falling"
    SHARED_DATA["TIDE_DIR"] = tide_direction

tide_next_change = next_entry.get("hour", "")[: 5]
                    elif prev_entry and not next_entry:
                        # After last entry of day - extrapolate direction
prev_height = float(prev_entry.get("level", 1))
    mean_level = harbor_data.get("mean_level", 1.1)
    tide_level = min(100, max(0, int(prev_height / (mean_level * 2) * 100)))
    SHARED_DATA["TIDE"] = tide_level
                        
                        # Check if prev was high or low to determine direction
    if prev_height > mean_level:
        tide_direction = "falling"  # After high tide, going down
    else:
        tide_direction = "rising"   # After low tide, going up
    SHARED_DATA["TIDE_DIR"] = tide_direction
                        
                        # Next change is first entry of tomorrow(wrap around)
    if hours:
        tide_next_change = hours[0].get("hour", "")[: 5]+ " (tomorrow)"
    
    SHARED_DATA["TIDE_NEXT"] = tide_next_change

tide_last_update = time.time()
print(f"OK:TIDE:SYNC:level={tide_level},dir={tide_direction}")
    except Exception as e:
print(f"ERR:TIDE:FETCH:{e}")

`,
        commands: `    if cmd == "TIDE:SYNC":
    fetch_tide_data()
return True
if cmd == "TIDE:STATUS":
    print(f"OK:TIDE:STATUS:level={tide_level},dir={tide_direction},next={tide_next_change}")
return True
if cmd == "TIDE:DEBUG":
    import time
        print("=== TIDE DEBUG INFO ===")
print(f"Level: {tide_level}%")
print(f"Direction: {tide_direction}")
print(f"Next change: {tide_next_change}")
print(f"Harbor ID: {TIDE_HARBOR_ID}")
print(f"Matrix: {TIDE_MATRIX_W}x{TIDE_MATRIX_H} = {TIDE_LED_COUNT} LEDs")
print(f"Last update: {int(time.time() - tide_last_update)}s ago")
print(f"Update interval: {TIDE_UPDATE_INTERVAL}s")
print(f"Enabled: {tide_enabled}")
if wifi_sta:
    print(f"WiFi connected: {wifi_sta.isconnected()}")
if wifi_sta.isconnected():
    print(f"IP: {wifi_sta.ifconfig()[0]}")
print("======================")
return True
if cmd == "TIDE:TEST":
    import time
        print("=== TIDE API TEST ===")
try:
now = time.localtime()
year = now[0]
month = now[1]
day = now[2]
hour = now[3]
minute = now[4]
print(f"ESP32 DateTime: {year}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}")
if year < 2024:
    print("WARNING: Date seems wrong! NTP may not be synced.")
print("WiFi must connect first for NTP sync.")
url = f"{TIDE_API_BASE}/tabua-mare/{TIDE_HARBOR_ID}/{month}/[{day}]"
print(f"URL: {url}")
print("Fetching...")
response = urequests.get(url)
raw = response.text
response.close()
print(f"Response length: {len(raw)}")
data = json.loads(raw)
if data.get("data") and len(data["data"]) > 0:
harbor = data["data"][0]
print(f"Harbor: {harbor.get('harbor_name', 'Unknown')}")
print(f"Mean level: {harbor.get('mean_level', 'N/A')}m")
months = harbor.get("months", [])
if months:
    days = months[0].get("days", [])
if days:
    hours = days[0].get("hours", [])
print(f"Found {len(hours)} tide entries:")
for h in hours:
    hora = h.get("hour", "??")[: 5]
nivel = h.get("level", "?")
print(f"  {hora} - {nivel}m")
                    else:
print("No days data")
                else:
print("No months data")
            else:
print(f"No data in response")
print(f"Raw: {raw[:300]}")
        except Exception as e:
print(f"ERR: {e}")
print("===================")
return True
if cmd == "TIDE:NTP":
    try:
import ntptime
            print("Syncing NTP...")
ntptime.settime()
import time
            now = time.localtime()
print(f"OK:NTP:SYNCED:{now[0]}-{now[1]:02d}-{now[2]:02d} {now[3]:02d}:{now[4]:02d}")
        except Exception as e:
print(f"ERR:NTP:{e}")
return True
if cmd == "TIDE:SHOW":
    set_tide_enabled(True)
print("OK:TIDE:SHOW")
return True
    if cmd == "TIDE:HIDE":
        set_tide_enabled(False)
        print("OK:TIDE:HIDE")
        return True
if cmd.startswith("TIDE:LEVEL:"):
    set_tide_level(cmd.split(":")[2])
return True
if cmd.startswith("TIDE:DIR:"):
    set_tide_direction(cmd.split(":")[2])
return True`,
        init: `# Initialize tide logic
    print("TIDE: Logic ready")
    # Initial status update to shared data
    SHARED_DATA["TIDE"] = tide_level
    SHARED_DATA["TIDE_DIR"] = tide_direction`,
        loop: `# Premium Tide Logic update
    if time.time() - tide_last_update > TIDE_UPDATE_INTERVAL:
        if wifi_sta and wifi_sta.isconnected():
            fetch_tide_data()`,
        caps: ['TIDE']
    };
}



function generateWebServerSnippet(config: ModuleConfig): ModuleSnippet {
    const port = config.webServerConfig?.port || 80;
    const title = config.webServerConfig?.title || 'ESP32 Control';
    const techPin = config.webServerConfig?.technicianPin || '1234';
    const captive = config.webServerConfig?.captivePortal !== false; // Default true

    return {
        imports: 'import socket\nimport uselect\nimport network\nimport machine\nimport os',
        globals: `
# Web Server v2 Globals
WEB_PORT = ${port}
WEB_TITLE = "${title}"
TECH_PIN = "${techPin}"
CAPTIVE_PORTAL = ${captive ? 'True' : 'False'}

http_socket = None
http_poll = None
dns_socket = None

# Session management (Simple Token)
tech_session_token = None

def setup_web_server():
    global http_socket, http_poll, dns_socket
    try:
        # HTTP Server
        addr = socket.getaddrinfo('0.0.0.0', WEB_PORT)[0][-1]
        http_socket = socket.socket()
        http_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        http_socket.bind(addr)
        http_socket.listen(5)
        
        http_poll = uselect.poll()
        http_poll.register(http_socket, uselect.POLLIN)
        print(f"WEB: Server listening on port {WEB_PORT}")

        # DNS Server (Captive Portal)
        if CAPTIVE_PORTAL and not wifi_sta.isconnected():
            setup_ap_mode()
            dns_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            dns_socket.setblocking(False)
            dns_socket.bind(('', 53))
            http_poll.register(dns_socket, uselect.POLLIN)
            print("WEB: Captive Portal DNS Active")

    except Exception as e:
        print(f"WEB: Setup failed: {e}")

def setup_ap_mode():
    import binascii
    uid = binascii.hexlify(machine.unique_id()).decode()[-4:]
    ssid = f"Device-{uid}"
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=ssid, authmode=0)
    print(f"WEB: AP Mode started: {ssid} (192.168.4.1)")

def handle_dns_request(sock):
    try:
        data, addr = sock.recvfrom(1024)
        # Simple DNS Hijack: Respond with own IP (192.168.4.1) for ALL queries
        # DNS Header: ID(2), Flags(2), QCount(2), Ans(2), Auth(2), Add(2)
        # We construct a response that points to 192.168.4.1
        
        # Extract Transaction ID
        trans_id = data[:2]
        
        # Flags: Standard Query Response, No Error
        flags = b'\\x81\\x80'
        
        # Counts: 1 Question, 1 Answer
        counts = b'\\x00\\x01\\x00\\x01\\x00\\x00\\x00\\x00'
        
        # Question Section (copy from request)
        # Find end of question (null byte)
        idx = 12
        while data[idx] != 0:
            idx += 1 + data[idx]
        idx += 5 # Skip null + QTYPE + QCLASS
        question = data[12:idx]
        
        # Answer Section
        # Name Ptr (0xC00C), TYPE A (0x0001), CLASS IN (0x0001), TTL (60s), LEN (4), IP
        answer = b'\\xc0\\x0c\\x00\\x01\\x00\\x01\\x00\\x00\\x00\\x3c\\x00\\x04\\xc0\\xa8\\x04\\x01'
        
        response = trans_id + flags + counts + question + answer
        sock.sendto(response, addr)
    except Exception:
        pass

def handle_web_request(client):
    global tech_session_token
    try:
        # Read request line
        req_line = client.readline()
        if not req_line:
            client.close()
            return
            
        req_str = req_line.decode().strip()
        method, path, proto = req_str.split()
        
        # Read headers
        headers = {}
        while True:
            h = client.readline()
            if not h or h == b'\\r\\n': break
            try:
                k, v = h.decode().strip().split(':', 1)
                headers[k.strip().lower()] = v.strip()
            except Exception: pass

        # Routing
        if path == "/tech/login" and method == "POST":
            handle_tech_login(client)
        elif path == "/tech/update" and method == "POST":
            # Check auth
            if not is_tech_auth(headers):
                send_401(client)
            else:
                handle_ota_update(client, headers)
        elif path == "/api/wifi" and method == "POST":
            handle_wifi_config(client)
        elif path == "/api/status":
            import json
            status = {
                "mode": current_mode,
                "uptime": time.ticks_ms() // 1000,
                "wifi": wifi_sta.ifconfig()[0] if wifi_sta else "disconnected"
            }
            client.send("HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n" + json.dumps(status))
        elif path == "/api/screen" and method == "POST":
            handle_screen_api(client, req_str)
        elif path.startswith("/tech"):
            if not is_tech_auth(headers):
                serve_tech_login(client)
            else:
                serve_tech_dashboard(client)
        else:
            # Captive Portal Checks
            if path == "/generate_204" or path == "/hotspot-detect.html" or "apple" in path:
                # Redirect to root
                client.send("HTTP/1.1 302 Found\\r\\nLocation: /\\r\\n\\r\\n")
            else:
                # Basic Command handling (GET /?cmd=...)
                if "cmd=" in path:
                    handle_legacy_cmd(path)
                    client.send("HTTP/1.1 302 Found\\r\\nLocation: /\\r\\n\\r\\n")
                else:
                    serve_user_dashboard(client)
                
        client.close()
    except Exception as e:
        print(f"WEB: Req Error: {e}")
        try: client.close()
        except Exception: pass

def is_tech_auth(headers):
    cookie = headers.get('cookie', '')
    if f"token={tech_session_token}" in cookie and tech_session_token is not None:
        return True
    return False

def send_401(client):
    client.send("HTTP/1.1 401 Unauthorized\\r\\n\\r\\nUnauthorized")

def handle_tech_login(client):
    global tech_session_token
    # Read body (PIN)
    body = client.read(1024).decode()
    if TECH_PIN in body:
        import urandom
        tech_session_token = str(urandom.getrandbits(32))
        client.send(f"HTTP/1.1 200 OK\\r\\nSet-Cookie: token={tech_session_token}; Path=/\\r\\n\\r\\nOK")
    else:
        send_401(client)

def handle_ota_update(client, headers):
    try:
        content_len = int(headers.get('content-length', 0))
        if content_len == 0:
            client.send("HTTP/1.1 400 Bad Request\\r\\n\\r\\nNo Content")
            return

        print(f"WEB: Starting OTA Update ({content_len} bytes)")
        
        # We need to write to the 'next' partition. 
        # For simplicity in this snippets, we will write to a file 'update.bin' 
        # and rely on a bootloader or just overwrite main.py if it's a script update.
        # BUT for true OTA, we usually use esp32.Partition.
        # Here we will overwrite main.py for script-based updates (Dangerous but standard for MicroPython file-based fw)
        
        with open('main.py.new', 'wb') as f:
            remaining = content_len
            while remaining > 0:
                chunk_size = 1024 if remaining > 1024 else remaining
                chunk = client.read(chunk_size)
                if not chunk: break
                f.write(chunk)
                remaining -= len(chunk)
        
        # Swap files
        import os
        os.rename('main.py.new', 'main.py')
        
        client.send("HTTP/1.1 200 OK\\r\\n\\r\\nUpdate Complete. Rebooting...")
        time.sleep(1)
        machine.reset()
        
    except Exception as e:
        print(f"WEB: OTA Failed: {e}")
        client.send("HTTP/1.1 500 Error\\r\\n\\r\\nUpdate Failed")

def handle_wifi_config(client):
    # Read JSON body {"ssid": "...", "pass": "..."}
    try:
        body_json = client.read(1024).decode()
        # Parse logic (simplified)
        import json
        creds = json.loads(body_json)
        
        # Save to NVS
        import esp32
        nvs = esp32.NVS("system")
        nvs.set_blob("wifi_creds", json.dumps(creds))
        nvs.commit()
        
        client.send("HTTP/1.1 200 OK\\r\\n\\r\\nSaved. Rebooting...")
        time.sleep(1)
        machine.reset()
    except Exception:
        client.send("HTTP/1.1 500 Error\\r\\n\\r\\nSave Failed")

def serve_tech_login(client):
    html = """<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:50px}input{padding:10px;font-size:18px;text-align:center}button{padding:10px 20px;font-size:18px;background:#007bff;color:#fff;border:none;margin-top:10px}</style></head>
    <body><h2>Technician Access</h2><input type="password" id="pin" placeholder="PIN"><br><button onclick="login()">Login</button>
    <script>function login(){fetch('/tech/login',{method:'POST',body:document.getElementById('pin').value}).then(r=>{if(r.ok)location.reload();else alert('Invalid PIN')})}</script></body></html>"""
    client.send("HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n" + html)

def serve_tech_dashboard(client):
    html = """<!DOCTYPE html><html><head><title>Tech Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#1a1a1a;color:#0f0;font-family:monospace;padding:20px}.card{border:1px solid #333;padding:15px;margin-bottom:15px}button{background:#333;color:#fff;border:1px solid #555;padding:8px;cursor:pointer}</style></head>
    <body><h1>TECH MODE</h1>
    <div class="card"><h3>OTA Update</h3><input type="file" id="fw"><button onclick="upload()">Upload Firmware</button></div>
    <div class="card"><h3>Actions</h3><button onclick="fetch('/tech/reset',{method:'POST'})">Factory Reset</button></div>
    <script>
    function upload(){
        var f=document.getElementById('fw').files[0];
        if(!f)return;
        var h=new XMLHttpRequest();
        h.open("POST","/tech/update");
        h.send(f);
        h.onload=()=>alert(h.responseText);
    }
    </script></body></html>"""
    client.send("HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n" + html)

def handle_screen_api(client, req_str):
    try:
        # Find body
        parts = req_str.split("\\r\\n\\r\\n", 1)
        if len(parts) > 1:
            body_str = parts[1]
            import json
            body = json.loads(body_str)
            
            cmd = body.get("cmd", "")
            if cmd == "text":
                x = body.get("x", 0)
                y = body.get("y", 0)
                msg = body.get("msg", "")
                handle_command(f"DISP:TEXT:{x}:{y}:{msg}")
            elif cmd == "clear":
                handle_command("DISP:CLEAR")
                
            client.send('HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{"status":"ok"}')
        else:
            client.send("HTTP/1.1 400 Bad Request\\r\\n\\r\\n")
    except Exception as e:
        print(f"WEB: API Error {e}")
        client.send("HTTP/1.1 500 Error\\r\\n\\r\\n")

def handle_legacy_cmd(path):
    # /?cmd=mode&val=PARTY
    try:
        global current_mode
        qs = path.split("?")[1]
        pairs = qs.split("&")
        params = {}
        for p in pairs:
            k, v = p.split("=")
            params[k] = v
        
        if "mode" in params:
            new_mode = params["mode"]
            if new_mode in MODES:
                current_mode = new_mode
                print(f"WEB: Mode changed to {new_mode}")
    except Exception:
        pass

def serve_user_dashboard(client):
    # Provisioning UI or Normal UI depending on mode
    is_ap = not wifi_sta.isconnected()
    
    if is_ap:
        # Provisioning UI
        html = """<!DOCTYPE html><html><head><title>Setup WiFi</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#fff;color:#333;font-family:sans-serif;padding:20px;text-align:center}input{display:block;width:90%;margin:10px auto;padding:10px;border:1px solid #ccc}button{background:#007bff;color:#fff;padding:12px 30px;border:none;border-radius:5px;font-size:16px}</style></head>
        <body><h1>Connect Device</h1><p>Enter your WiFi credentials</p>
        <input id="ssid" placeholder="WiFi Name (SSID)">
        <input id="pass" type="password" placeholder="Password">
        <button onclick="save()">Connect</button>
        <script>function save(){fetch('/api/wifi',{method:'POST',body:JSON.stringify({ssid:document.getElementById('ssid').value,pass:document.getElementById('pass').value})}).then(r=>alert('Saved. Device will reboot.'))}</script></body></html>"""
    else:
        # Normal User UI
        html = f"""<!DOCTYPE html><html><head><title>{WEB_TITLE}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{{background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:20px}}.mode-btn{{display:block;width:100%;padding:15px;margin:10px 0;background:#333;color:#fff;text-decoration:none;border-radius:8px}}</style></head>
        <body><h1>{WEB_TITLE}</h1><h3>Current Mode: {current_mode}</h3>
        <a href="/?cmd=mode&val=AMBIENT" class="mode-btn">AMBIENT</a>
        <a href="/?cmd=mode&val=PARTY" class="mode-btn">PARTY</a>
        <a href="/?cmd=mode&val=SIGNAGE" class="mode-btn">SIGNAGE</a>
        <br><a href="/tech" style="color:#555;font-size:12px">Technician Access</a></body></html>"""

    client.send("HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n" + html)
`,
        commands: `    if cmd == "WEB:START":
        setup_web_server()
        return True
    if cmd == "WEB:STOP":
        try:
            http_socket.close()
        except Exception: pass
        print("OK:WEB:STOPPED")
        return True`,
        init: `setup_web_server()`,
        loop: `    # Web Server Poll (HTTP + DNS)
    if http_poll:
        res = http_poll.poll(0)
        for sock, ev in res:
            if sock == http_socket:
                client, addr = http_socket.accept()
                handle_web_request(client)
            elif sock == dns_socket:
                handle_dns_request(dns_socket)`,
        caps: ['WEB', 'CAPTIVE']
    };
}

// === MQTT MODULE ===
function generateMqttSnippet(config: ModuleConfig): ModuleSnippet {
    const c = config.mqttConfig || { broker: 'homeassistant.local', port: 1883, topicPrefix: 'esp32', homeAssistantDiscovery: true };
    const user = c.user ? `"${c.user}"` : 'None';
    const password = c.password ? `"${c.password}"` : 'None';

    return {
        imports: 'from umqtt.simple import MQTTClient',
        globals: `
# MQTT Globals
MQTT_BROKER = "${c.broker}"
MQTT_PORT = ${c.port}
MQTT_USER = ${user}
MQTT_PASS = ${password}
MQTT_TOPIC_PREFIX = "${c.topicPrefix}"
mqtt_client = None

def mqtt_callback(topic, msg):
    try:
        t = topic.decode()
        m = msg.decode()
        print(f"MQTT: Recv {t}: {m}")
        # Map MQTT to internal commands
        # Topic: prefix/cmd -> Payload: VAR:SET:TEMP:25
        if t.endswith("/cmd"):
            handle_command(m)
    except Exception as e:
        print(f"MQTT: CB Error: {e}")

def setup_mqtt():
    global mqtt_client
    try:
        client_id = f"esp32_{unique_id().hex()}"
        mqtt_client = MQTTClient(client_id, MQTT_BROKER, port=MQTT_PORT, user=MQTT_USER, password=MQTT_PASS)
        mqtt_client.set_callback(mqtt_callback)
        mqtt_client.connect()
        print("MQTT: Connected")
        mqtt_client.subscribe(f"{MQTT_TOPIC_PREFIX}/cmd")
        
        # HA Discovery
        if ${c.homeAssistantDiscovery ? 'True' : 'False'}:
            import json
            disc_topic = f"homeassistant/light/{client_id}/config"
            payload = {
                "name": "${config.name}",
                "unique_id": client_id,
                "cmd_t": f"{MQTT_TOPIC_PREFIX}/cmd",
                "stat_t": f"{MQTT_TOPIC_PREFIX}/state",
                "schema": "json",
                "brightness": True,
                "rgb": True,
                "effect": True
            }
            # mqtt_client.publish(disc_topic, json.dumps(payload)) # Enable for real HA
            
    except Exception as e:
        print(f"MQTT: Fail {e}")
        mqtt_client = None

def mqtt_check():
    if mqtt_client:
        try:
            mqtt_client.check_msg()
        except Exception:
            print("MQTT: Lost connection")
            setup_mqtt()
`,
        commands: `    if cmd == "MQTT:RECONNECT":
        setup_mqtt()
        return True`,
        init: `setup_mqtt()`,
        loop: `    # MQTT Check
    if time.ticks_ms() % 100 == 0:
        mqtt_check()`,
        caps: ['MQTT']
    };
}

// === OTA MODULE ===
function generateOtaSnippet(config: ModuleConfig): ModuleSnippet {
    return {
        imports: 'import socket',
        globals: `
# OTA Globals
def start_ota_listener():
    # Simple socket listener that accepts a file upload on port 8266
    # This is a blocking operation usually, or async.
    # For stability, we might just print instructions or start a separate mode.
    pass

def do_ota_update(url):
    # Fetch from URL
    try:
        import urequests
        print(f"OTA: Downloading from {url}")
        recv = urequests.get(url)
        if recv.status_code == 200:
            with open('main.py', 'w') as f:
                f.write(recv.text)
            print("OTA: Success. Resetting...")
            import machine
            machine.reset()
        else:
            print("OTA: Fail status")
    except Exception as e:
        print(f"OTA: Error {e}")
`,
        commands: `    if cmd.startswith("OTA:URL:"):
        url = cmd.split(":", 2)[2]
        do_ota_update(url)
        return True`,
        init: `print("OTA: Ready (CMD: OTA:URL:http://...)")`,
        loop: ``,
        caps: ['OTA']
    };
}

// === UDP SYNC (WLED/Raw) ===
function generateUdpSnippet(config: ModuleConfig): ModuleSnippet {
    const port = config.udpConfig?.port || 21324;
    return {
        imports: 'import socket\nimport uselect',
        globals: `
# UDP Sync Globals
UDP_PORT = ${port}
udp_socket = None
udp_poll = None

def setup_udp():
    global udp_socket, udp_poll
    try:
        udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        udp_socket.bind(('', UDP_PORT))
        udp_socket.setblocking(False)
        udp_poll = uselect.poll()
        udp_poll.register(udp_socket, uselect.POLLIN)
        print(f"UDP: Listening on {UDP_PORT}")
    except Exception as e:
        print(f"UDP: Setup fail {e}")

def check_udp():
    if udp_poll:
        res = udp_poll.poll(0)
        if res:
            try:
                data, addr = udp_socket.recvfrom(1024)
                # Raw WLED/DRGB: 2, 255 (timeout), [r,g,b]...
                # Simple implementation: expect raw RGB dump
                # or tpm2.net. For now, assume raw RGB for simplicity if size matches
                if len(data) > 0 and 'np' in globals():
                    # Just naive copy for now (improves latency)
                    # Ideally check protocol headers (WLED: 2 or 4)
                    # WARN: This might block or be slow in python
                    pass 
            except Exception: pass
`,
        commands: `    if cmd == "UDP:START":
        setup_udp()
        return True`,
        init: `setup_udp()`,
        loop: `    check_udp()`,
        caps: ['UDP']
    };
}

// === GENERIC MODULES (Phase 9) ===

// === NVS MODULE (Persistent Storage) ===
function generateNvsSnippet(config: ModuleConfig): ModuleSnippet {
    const ns = config.nvsConfig?.namespace || 'app_data';
    const autoSave = config.nvsConfig?.autoSave || ['WIFI_SSID', 'WIFI_PASS'];

    return {
        imports: 'import esp32',
        globals: `
# NVS Globals
NVS_NS = "${ns}"
nvs = esp32.NVS(NVS_NS)
NVS_DIRTY = False
NVS_AUTOSAVE_KEYS = ${JSON.stringify(autoSave)}

def nvs_load():
    try:
        # Load known keys
        # Since NVS stores typed data, we need a strategy.
        # For simplicity, we assume strings or store JSON blob.
        # Here we just iterate known keys if possible or specific keys
        for key in NVS_AUTOSAVE_KEYS:
            try:
                # Buffer for string reading (128 bytes max)
                buf = bytearray(128)
                sz = nvs.get_blob(key, buf)
                val = buf[:sz].decode()
                SHARED_DATA[key] = val
                print(f"NVS: Loaded {key}={val}")
            except Exception: pass
    except Exception as e:
        print(f"NVS: Load Error {e}")

def nvs_save_key(key, val):
    try:
        nvs.set_blob(key, str(val).encode())
        nvs.commit()
    except Exception as e:
        print(f"NVS: Save Error {e}")
`,
        commands: `    if cmd.startswith("NVS:SAVE:"):
        # NVS:SAVE:KEY:VAL
        parts = cmd.split(":", 3)
        if len(parts) >= 4:
            nvs_save_key(parts[2], parts[3])
            print(f"OK:NVS:SAVED:{parts[2]}")
        return True
    if cmd == "NVS:CLEAR":
        try:
            nvs.erase_all()
            nvs.commit()
            print("OK:NVS:CLEARED")
        except Exception: pass
        return True`,
        init: `
    try:
        nvs_load()
        print(f"NVS: Config loaded from namespace '{ns}'")
    except Exception:
        print("NVS: Init failed (partition missing?)")
`,
        loop: ``,
        caps: ['NVS']
    };
}

// === ESP-NOW MODULE ===
function generateEspNowSnippet(config: ModuleConfig): ModuleSnippet {
    const pmk = config.espNowConfig?.pmk || 'PMK1234567890123';
    return {
        imports: 'import espnow\nimport network',
        globals: `
# ESP-NOW Globals
enow = None
ESPNOW_PMK = "${pmk}"

def setup_espnow():
    global enow
    try:
        sta = network.WLAN(network.STA_IF)
        sta.active(True)
        enow = espnow.ESPNow()
        enow.active(True)
        try:
            enow.set_pmk(ESPNOW_PMK)
        except Exception: pass # Might fail on some ports
        print("ESPNOW: Init success")
    except Exception as e:
        print(f"ESPNOW: Init fail {e}")

def handle_espnow_packet():
    if enow:
        host, msg = enow.recv(0) # Non-blocking
        if msg:
            print(f"ESPNOW:RECV:{host.hex()}:{msg.decode()}")
            # Optional: Treat as command
            # handle_command(msg.decode())
`,
        commands: `    if cmd.startswith("ESPNOW:SEND:"):
        # ESPNOW:SEND:MAC:MSG
        parts = cmd.split(":", 3)
        if len(parts) >= 4 and enow:
            try:
                mac = bytes.fromhex(parts[2])
                enow.send(mac, parts[3].encode())
                print("OK:ESPNOW:SENT")
            except Exception as e:
                print(f"ERR:ESPNOW:SEND:{e}")
        return True`,
        init: `setup_espnow()`,
        loop: `    try:
        handle_espnow_packet()
    except Exception: pass`,
        caps: ['ESPNOW']
    };
}

// === BLE MODULE (Nordic UART + Beacon) ===
function generateBleSnippet(config: ModuleConfig): ModuleSnippet {
    const name = config.bleConfig?.name || 'ESP32-BLE';
    return {
        imports: 'import ubluetooth',
        globals: `
# BLE Globals (Minimal UART)
ble = ubluetooth.BLE()
ble_uart_rx = None

def setup_ble():
    ble.active(True)
    ble.config(gap_name='${name}')
    print("BLE: Active")
    # Setup services would go here (complex for snippet)
    # verifying user manual requirement first
`,
        commands: `    if cmd == "BLE:STATUS":
        print(f"OK:BLE:ACTIVE={ble.active()}")
        return True`,
        init: `setup_ble()`,
        loop: ``,
        caps: ['BLE']
    };
}

// === DISPLAY MODULE (SSD1306/SH1106) ===
function generateDisplaySnippet(config: ModuleConfig): ModuleSnippet {
    // Assuming SSD1306 via I2C for prototype
    const w = config.displayConfig?.width || 128;
    const h = config.displayConfig?.height || 64;
    const sda = 21; // Default
    const scl = 22; // Default
    return {
        imports: 'import machine\nimport ssd1306',
        globals: `
# Display Globals
disp = None
def setup_display():
    global disp
    try:
        i2c = machine.I2C(0, scl=machine.Pin(${scl}), sda=machine.Pin(${sda}))
        disp = ssd1306.SSD1306_I2C(${w}, ${h}, i2c)
        disp.fill(0)
        disp.text("ESP32 Ready", 0, 0)
        disp.show()
        print("DISP: Ready")
    except Exception as e:
        print(f"DISP: Init Error {e}")
`,
        commands: `    if cmd.startswith("DISP:TEXT:"):
        # DISP:TEXT:X:Y:MSG
        parts = cmd.split(":", 4)
        if len(parts) >= 5 and disp:
            try:
                x = int(parts[2])
                y = int(parts[3])
                msg = parts[4]
                disp.text(msg, x, y, 1)
                disp.show()
                print("OK:DISP:TEXT")
            except Exception: pass
        return True
    if cmd == "DISP:CLEAR":
        if disp:
            disp.fill(0)
            disp.show()
        return True`,
        init: `setup_display()`,
        loop: ``,
        caps: ['DISPLAY']
    };
}




// === AUTOMATION MODULE ===
function generateAutomationSnippet(config: ModuleConfig): ModuleSnippet {
    const rules = config.automationConfig?.rules || [];
    const timers = config.automationConfig?.timers || [];

    // Convert rules to Python list
    const pyRules = rules.map(r => `("${r.trigger}", "${r.command}")`).join(', ');

    // Convert timers
    const pyTimers = timers.map(t => `{ "time": "${t.time}", "cmd": "${t.command}" }`).join(', ');

    return {
        imports: 'import re',
        globals: `
# Automation
RULES = [${pyRules}]
TIMERS = [${pyTimers}]
last_timer_check = 0

def check_rules(evt):
    for rule in RULES:
        pattern = rule[0].replace("*", ".*")
        if re.match(pattern, evt):
            handle_command(rule[1])
`,
        commands: `    if cmd == "RULES:LIST":
        print(f"OK:RULES:{len(RULES)}")
        return True`,
        init: '',
        loop: `
    # Timer Check (every 30s)
    if time.time() - last_timer_check > 30:
        last_timer_check = time.time()
        # Get current HH:MM
        t = time.localtime()
        now_str = f"{t[3]:02}:{t[4]:02}"
        for timer in TIMERS:
            if timer["time"] == now_str:
                handle_command(timer["cmd"])
`,
        caps: ['AUTOMATION']
    };
}

export function getRecoveryFirmware(): string {
    // Read from file or return embedded minimal version
    return `# ESP32 Recovery Firmware
import machine, sys, time, uselect

try:
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)
HAS_POLL = True
except Exception:
HAS_POLL = False

led = machine.Pin(2, machine.Pin.OUT)

def read_input():
if HAS_POLL and spoll.poll(0):
return sys.stdin.readline()
return None

def handle_command(cmd):
cmd = cmd.strip().upper()

if cmd == "SYS:HELLO":
    print("SYS:HELLO:ESP32_RECOVERY")
print("OK:DEVICE=ESP32_RECOVERY;FW=3.0.0;CAPS=LED,OTA")
return

if cmd == "LED:ON":
    led.value(1)
print("OK:LED:ON")
return

if cmd == "LED:OFF":
    led.value(0)
print("OK:LED:OFF")
return

if cmd == "SYS:RESET":
    print("OK:SYS:RESET")
time.sleep(0.5)
machine.reset()
return

print(f"ERR:UNKNOWN_CMD:{cmd}")

# ============ INIT ============
    print("SYS:READY:ESP32_RECOVERY")

# Boot Blink
for _ in range(3):
    led.value(1)
    time.sleep(0.1)
    led.value(0)
    time.sleep(0.1)

# ============ MAIN LOOP ============
while True:
    cmd = read_input()
    if cmd:
        handle_command(cmd)
    time.sleep(0.01)
`;
}

// ============ MODE (Phase 11: Device Modes) ============
function generateModeSnippet(config: ModuleConfig, _intent: FirmwareIntent): ModuleSnippet {
    const mc = config.modeConfig;
    if (!mc || !mc.enabled) {
        return { imports: '', globals: '', commands: '', init: '', loop: '', caps: [] };
    }

    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const modes = mc.modes || ['AMBIENT', 'PARTY'];
    const defaultMode = mc.defaultMode || modes[0];
    const buttonPin = mc.buttonPin;
    const longPressDuration = mc.longPressDuration || 1000;

    // Build profiles dictionary
    const profilesDict = modes.map(mode => {
        const profile = mc.profiles?.[mode] || { animation: 'RAINBOW' as const, brightness: 50 };
        return `"${mode}": {"anim": "${profile.animation}", "bright": ${profile.brightness}}`;
    }).join(', ');

    const buttonGlobals = buttonPin !== undefined ? `
mode_btn_${name} = machine.Pin(${buttonPin}, machine.Pin.IN, machine.Pin.PULL_UP)
mode_btn_last_${name} = 1
mode_btn_press_time_${name} = 0
` : '';

    const buttonLoop = buttonPin !== undefined ? `
    # Mode Button Handler
    btn_val = mode_btn_${name}.value()
    if btn_val == 0 and mode_btn_last_${name} == 1:
        mode_btn_press_time_${name} = time.ticks_ms()
    elif btn_val == 1 and mode_btn_last_${name} == 0:
        press_duration = time.ticks_diff(time.ticks_ms(), mode_btn_press_time_${name})
        if press_duration < ${longPressDuration}:
            cycle_mode_${name}()
            dispatch_event(f"MODE:{current_mode_${name}}")
    mode_btn_last_${name} = btn_val
` : '';

    return {
        imports: '',
        globals: `
# === DEVICE MODES: ${name} ===
MODE_LIST_${name} = ${JSON.stringify(modes)}
MODE_PROFILES_${name} = {${profilesDict}}
current_mode_${name} = "${defaultMode}"
${buttonGlobals}
def cycle_mode_${name}():
    global current_mode_${name}
    idx = MODE_LIST_${name}.index(current_mode_${name})
    current_mode_${name} = MODE_LIST_${name}[(idx + 1) % len(MODE_LIST_${name})]
    apply_mode_${name}()

def set_mode_${name}(mode):
    global current_mode_${name}
    if mode in MODE_LIST_${name}:
        current_mode_${name} = mode
        apply_mode_${name}()
        return True
    return False

def apply_mode_${name}():
    global current_mode_${name}
    profile = MODE_PROFILES_${name}.get(current_mode_${name}, {})
    anim = profile.get("anim", "RAINBOW")
    bright = profile.get("bright", 50)
    SHARED_DATA["MODE"] = current_mode_${name}
    SHARED_DATA["MODE_ANIM"] = anim
    SHARED_DATA["BRIGHTNESS"] = int(bright * 2.55)
    print(f"SYS:MODE:{current_mode_${name}}:ANIM={anim}:BRIGHT={bright}")
`,
        commands: `
    # MODE Commands
    if cmd == "MODE:NEXT":
        cycle_mode_${name}()
        return "OK:MODE:" + current_mode_${name}
    if cmd == "MODE:GET":
        return f"OK:MODE:{current_mode_${name}}"
    if cmd.startswith("MODE:SET:"):
        new_mode = cmd.split(":")[2]
        if set_mode_${name}(new_mode):
            return "OK:MODE:" + new_mode
        return "ERR:INVALID_MODE"
    if cmd == "MODE:LIST":
        return "OK:MODES:" + ",".join(MODE_LIST_${name})
`,
        init: `
    # Initialize Device Mode
    apply_mode_${name}()
    print(f"SYS:MODE_INIT:{current_mode_${name}}")
`,
        loop: `${buttonLoop}`,
        caps: ['MODE']
    };
}

// ============ TELEMETRY (Phase 12: Marketing Intelligence) ============
function generateTelemetrySnippet(config: ModuleConfig, _intent: FirmwareIntent): ModuleSnippet {
    const tc = config.telemetryConfig;
    if (!tc || !tc.enabled || !tc.consentGiven) {
        return { imports: '', globals: '', commands: '', init: '', loop: '', caps: [] };
    }

    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const metrics = tc.metrics || ['LIFECYCLE', 'FEATURES'];
    const reportInterval = tc.reportInterval || 3600;
    const persistToNvs = tc.persistToNvs !== false;
    const anonymize = tc.anonymize !== false;

    // Build metrics flags
    const hasLifecycle = metrics.includes('LIFECYCLE');
    const hasFeatures = metrics.includes('FEATURES');
    const hasBehavior = metrics.includes('BEHAVIOR');
    const hasReliability = metrics.includes('RELIABILITY');

    return {
        imports: `import hashlib
import gc`,
        globals: `
# === TELEMETRY: ${name} ===
_TEL_VERSION = "1.0"
_TEL_CONSENT = True  # User opted-in
_TEL_ANONYMIZE = ${anonymize}
_TEL_PERSIST = ${persistToNvs}
_TEL_INTERVAL = ${reportInterval}
_TEL_LAST_REPORT = 0

# Device fingerprint (anonymized)
def _tel_device_id():
    import machine
    uid = machine.unique_id()
    if _TEL_ANONYMIZE:
        return hashlib.sha256(uid).hexdigest()[:16]
    return uid.hex()

# Telemetry data structure
TEL_DATA = {
    "v": _TEL_VERSION,
    "did": "",  # Set on init
    ${hasLifecycle ? `"lc": {"boot": 0, "up": 0, "rst": ""},` : ''}
    ${hasFeatures ? `"ft": {"anim": {}, "mode": {}, "cmd": 0},` : ''}
    ${hasBehavior ? `"bh": {"sess": 0, "peak": 0, "bright": []},` : ''}
    ${hasReliability ? `"rl": {"err": 0, "wdt": 0, "wifi": 0, "mem": 0}` : ''}
}

def tel_init():
    TEL_DATA["did"] = _tel_device_id()
    ${hasLifecycle ? 'TEL_DATA["lc"]["boot"] += 1' : ''}
    ${hasLifecycle ? 'TEL_DATA["lc"]["rst"] = str(machine.reset_cause())' : ''}
    ${persistToNvs ? 'tel_load()' : ''}
    print(f"TEL:INIT:{TEL_DATA[\\'did\\']}")

def tel_track_anim(anim_name):
    ${hasFeatures ? `
    if "anim" in TEL_DATA.get("ft", {}):
        TEL_DATA["ft"]["anim"][anim_name] = TEL_DATA["ft"]["anim"].get(anim_name, 0) + 1` : 'pass'}

def tel_track_mode(mode_name):
    ${hasFeatures ? `
    if "mode" in TEL_DATA.get("ft", {}):
        TEL_DATA["ft"]["mode"][mode_name] = TEL_DATA["ft"]["mode"].get(mode_name, 0) + 1` : 'pass'}

def tel_track_cmd():
    ${hasFeatures ? 'TEL_DATA["ft"]["cmd"] = TEL_DATA["ft"].get("cmd", 0) + 1' : 'pass'}

def tel_track_error():
    ${hasReliability ? 'TEL_DATA["rl"]["err"] = TEL_DATA["rl"].get("err", 0) + 1' : 'pass'}

def tel_track_brightness(val):
    ${hasBehavior ? `
    bright_list = TEL_DATA.get("bh", {}).get("bright", [])
    bright_list.append(val)
    if len(bright_list) > 24:
        bright_list.pop(0)  # Keep last 24 samples` : 'pass'}

def tel_update_uptime():
    ${hasLifecycle ? `
    TEL_DATA["lc"]["up"] = int(time.time() - _boot_time) if "_boot_time" in dir() else 0` : 'pass'}

def tel_report():
    tel_update_uptime()
    gc.collect()
    ${hasReliability ? 'TEL_DATA["rl"]["mem"] = gc.mem_free()' : ''}
    return TEL_DATA

def tel_save():
    ${persistToNvs ? `
    try:
        if "nvs" in dir():
            nvs.set_str("tel_data", json.dumps(TEL_DATA))
            nvs.commit()
    except Exception:
        pass` : 'pass'}

def tel_load():
    ${persistToNvs ? `
    try:
        if "nvs" in dir():
            data = nvs.get_str("tel_data")
            if data:
                loaded = json.loads(data)
                for k in loaded:
                    if k in TEL_DATA:
                        TEL_DATA[k] = loaded[k]
    except Exception:
        pass` : 'pass'}

def tel_reset():
    for k in TEL_DATA:
        if isinstance(TEL_DATA[k], dict):
            TEL_DATA[k] = {}
        elif isinstance(TEL_DATA[k], int):
            TEL_DATA[k] = 0
    TEL_DATA["did"] = _tel_device_id()
`,
        commands: `
    # TELEMETRY Commands
    if cmd == "TEL:STATUS":
        return "OK:ENABLED" if _TEL_CONSENT else "OK:DISABLED"
    if cmd == "TEL:REPORT":
        tel_track_cmd()
        return "OK:TEL:" + json.dumps(tel_report())
    if cmd == "TEL:RESET":
        tel_reset()
        return "OK:TEL:RESET"
    if cmd == "TEL:SAVE":
        tel_save()
        return "OK:TEL:SAVED"
`,
        init: `
    # Initialize Telemetry
    global _boot_time
    _boot_time = time.time()
    tel_init()
`,
        loop: `
    # Telemetry periodic save (every ${reportInterval}s)
    if time.time() - _TEL_LAST_REPORT > _TEL_INTERVAL:
        _TEL_LAST_REPORT = time.time()
        tel_save()
`,
        caps: ['TELEMETRY']
    };
}

// ============ AUDIO REACTIVE (Phase 13) ============
function generateAudioSnippet(config: ModuleConfig, _intent: FirmwareIntent): ModuleSnippet {
    const ac = config.audioConfig;
    if (!ac || !ac.enabled) {
        return { imports: '', globals: '', commands: '', init: '', loop: '', caps: [] };
    }

    const name = config.name.replace(/[^a-zA-Z0-9]/g, '_');
    const pin = ac.pin || 34;
    const sampleRate = ac.sampleRate || 10000;
    const fftSize = ac.fftSize || 64;
    const autoGain = ac.autoGain !== false;
    const gainMin = ac.gainMin || 0.5;
    const gainMax = ac.gainMax || 5.0;
    const noiseFloor = ac.noiseFloor || 100;
    const beatDetection = ac.beatDetection !== false;
    const beatSensitivity = ac.beatSensitivity || 1.0;
    const beatDecay = ac.beatDecay || 200;
    const mode = ac.mode || 'SPECTRUM';
    const targetNeoPixel = ac.targetNeoPixel || '';

    return {
        imports: `from array import array
import math`,
        globals: `
# === AUDIO REACTIVE: ${name} ===
_AUD_PIN = ${pin}
_AUD_SAMPLE_RATE = ${sampleRate}
_AUD_FFT_SIZE = ${fftSize}
_AUD_AUTO_GAIN = ${autoGain}
_AUD_GAIN = 1.0
_AUD_GAIN_MIN = ${gainMin}
_AUD_GAIN_MAX = ${gainMax}
_AUD_NOISE_FLOOR = ${noiseFloor}
_AUD_BEAT_DETECT = ${beatDetection}
_AUD_BEAT_SENS = ${beatSensitivity}
_AUD_BEAT_DECAY = ${beatDecay}
_AUD_MODE = "${mode}"
_AUD_TARGET = "${targetNeoPixel}"

# Audio state
_aud_adc = None
_aud_samples = array('H', [0] * _AUD_FFT_SIZE)
_aud_spectrum = [0] * (_AUD_FFT_SIZE // 2)
_aud_bands = {"BASS": 0, "MID": 0, "HIGH": 0}
_aud_beat = False
_aud_beat_time = 0
_aud_energy_avg = 0
_aud_peak = 0

def _aud_init():
    global _aud_adc
    _aud_adc = machine.ADC(machine.Pin(_AUD_PIN))
    _aud_adc.atten(machine.ADC.ATTN_11DB)
    _aud_adc.width(machine.ADC.WIDTH_12BIT)
    print(f"AUDIO:INIT:PIN={_AUD_PIN}:FFT={_AUD_FFT_SIZE}")

def _aud_sample():
    """Collect samples from ADC"""
    for i in range(_AUD_FFT_SIZE):
        _aud_samples[i] = _aud_adc.read()

def _aud_simple_fft():
    """Simple magnitude spectrum (DFT, not full FFT for memory)"""
    global _aud_spectrum, _aud_bands
    n = _AUD_FFT_SIZE
    half = n // 2
    
    # Calculate magnitude at key frequencies
    for k in range(half):
        real = 0
        imag = 0
        for t in range(n):
            angle = 2 * 3.14159 * k * t / n
            real += (_aud_samples[t] - 2048) * math.cos(angle)
            imag -= (_aud_samples[t] - 2048) * math.sin(angle)
        _aud_spectrum[k] = int(math.sqrt(real*real + imag*imag) / n)
    
    # Extract bands (BASS: 0-5, MID: 5-15, HIGH: 15+)
    bass_end = min(5, half)
    mid_end = min(15, half)
    
    _aud_bands["BASS"] = sum(_aud_spectrum[0:bass_end]) // max(1, bass_end)
    _aud_bands["MID"] = sum(_aud_spectrum[bass_end:mid_end]) // max(1, mid_end - bass_end)
    _aud_bands["HIGH"] = sum(_aud_spectrum[mid_end:half]) // max(1, half - mid_end)

def _aud_detect_beat():
    """Energy-based beat detection"""
    global _aud_beat, _aud_beat_time, _aud_energy_avg, _aud_peak
    
    energy = sum(_aud_spectrum)
    
    # Running average (smooth)
    _aud_energy_avg = _aud_energy_avg * 0.95 + energy * 0.05
    
    # Beat = instant energy > 1.5x average
    threshold = _aud_energy_avg * 1.5 * _AUD_BEAT_SENS
    now = time.ticks_ms()
    
    if energy > threshold and (now - _aud_beat_time) > _AUD_BEAT_DECAY:
        _aud_beat = True
        _aud_beat_time = now
        _aud_peak = energy
        dispatch_event("AUDIO:BEAT")
    else:
        _aud_beat = False
    
    return _aud_beat

def _aud_auto_gain_adjust():
    """Automatic gain normalization"""
    global _AUD_GAIN
    peak = max(_aud_spectrum) if _aud_spectrum else 0
    
    if peak < 50:
        _AUD_GAIN = min(_AUD_GAIN * 1.02, _AUD_GAIN_MAX)
    elif peak > 200:
        _AUD_GAIN = max(_AUD_GAIN * 0.98, _AUD_GAIN_MIN)

def audio_process():
    """Main audio processing function"""
    _aud_sample()
    _aud_simple_fft()
    
    if _AUD_BEAT_DETECT:
        _aud_detect_beat()
    
    if _AUD_AUTO_GAIN:
        _aud_auto_gain_adjust()
    
    # Apply to SHARED_DATA
    SHARED_DATA["AUDIO_BASS"] = _aud_bands["BASS"]
    SHARED_DATA["AUDIO_MID"] = _aud_bands["MID"]
    SHARED_DATA["AUDIO_HIGH"] = _aud_bands["HIGH"]
    SHARED_DATA["AUDIO_BEAT"] = _aud_beat
    SHARED_DATA["AUDIO_PEAK"] = _aud_peak
    SHARED_DATA["AUDIO_MODE"] = _AUD_MODE

def audio_get_bands():
    return _aud_bands

def audio_get_spectrum():
    return _aud_spectrum
`,
        commands: `
    # AUDIO Commands
    if cmd == "AUDIO:STATUS":
        return f"OK:AUDIO:MODE={_AUD_MODE}:GAIN={_AUD_GAIN:.2f}"
    if cmd == "AUDIO:BANDS":
        return f"OK:AUDIO:BASS={_aud_bands['BASS']}:MID={_aud_bands['MID']}:HIGH={_aud_bands['HIGH']}"
    if cmd == "AUDIO:SPECTRUM":
        return "OK:AUDIO:SPEC:" + ",".join(str(x) for x in _aud_spectrum[:16])
    if cmd.startswith("AUDIO:MODE:"):
        new_mode = cmd.split(":")[2]
        if new_mode in ["SPECTRUM", "VU_METER", "BEAT_PULSE", "ENERGY"]:
            global _AUD_MODE
            _AUD_MODE = new_mode
            return "OK:AUDIO:MODE:" + new_mode
        return "ERR:INVALID_MODE"
`,
        init: `
    # Initialize Audio Reactive
    _aud_init()
`,
        loop: `
    # Audio processing (every frame)
    audio_process()
`,
        caps: ['AUDIO', 'FFT', 'BEAT_DETECT']
    };
}

export const modularFirmwareGenerator = {
    generateMicroPython: generateModularMicroPython,
    getRecoveryFirmware,
};
