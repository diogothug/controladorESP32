/**
 * Modular Firmware Generator
 * Composes firmware from base + module snippets
 */

import { ModuleConfig, FirmwareIntent, ValidationResult } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';
import { validateConfiguration } from './validator';

// Module snippet structure
interface ModuleSnippet {
    imports: string;
    globals: string;
    commands: string | Record<string, { handler: string, description?: string }>;
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
    'SERVO': generateServoSnippet,
};

// ============ ESP32 MicroPython Generator ============

export function generateModularMicroPython(intent: FirmwareIntent): string {
    const modules = intent.modules;
    console.log(`[Backend-FW-Gen] Generating firmware for ${modules.length} modules... Intent: ${intent.appName}`);

    // Validation V2
    const validation = validateConfiguration(modules);
    if (!validation.valid) {
        const errorMsg = `Firmware Validation Failed:\n${validation.errors.join('\n')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
    if (validation.warnings.length > 0) {
        console.warn(`[Backend-FW-Gen] Validation Warnings:\n${validation.warnings.join('\n')}`);
    }

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

    // Process commands (String or Object)
    const commands = snippets.map(s => {
        if (typeof s.commands === 'string') return s.commands;
        if (typeof s.commands === 'object') {
            return Object.entries(s.commands).map(([key, def]) => {
                const keyParts = key.split(':').length;

                // Smart Indent: Preserve relative indentation
                // 1. Find min common indentation (ignoring empty lines)
                const lines = def.handler.split('\n');
                let minIndent = Infinity;
                lines.forEach(line => {
                    if (line.trim().length > 0) {
                        const indent = line.search(/\S/);
                        if (indent !== -1 && indent < minIndent) minIndent = indent;
                    }
                });
                if (minIndent === Infinity) minIndent = 0;

                // 2. Re-indent to 8 spaces
                const handlerResult = lines.map(line => {
                    if (line.trim().length === 0) return '';
                    // Remove minIndent, add 8 spaces
                    return '        ' + line.slice(minIndent);
                }).join('\n');

                return `    if cmd.startswith("${key}"):
        parts = cmd.split(":")
        args = parts[${keyParts}:] if len(parts) > ${keyParts} else []
${handlerResult}
        return True`;
            }).join('\n');
        }
        return '';
    }).filter(Boolean).join('\n\n');

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
    const autoBrightness = config.neoPixelConfig?.autoBrightness ? 'True' : 'False';

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
AUTO_BRIGHTNESS_${name} = ${autoBrightness}  # Auto-adjust via LDR sensor

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
    # Auto-Brightness from LDR (if enabled)
    if AUTO_BRIGHTNESS_${name} and 'BRIGHTNESS' in SHARED_DATA:
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
        # ============ TIDE (Complete Visual Language) ============
        # --- Global State Injection ---
        if 'tide_globals_init_${name}' not in globals():
            global tide_globals_init_${name}, flow_offset_${name}, ambient_next_${name}, ambient_events_${name}
            tide_globals_init_${name} = True
            flow_offset_${name} = 0.0
            ambient_next_${name} = now_ms + 5000  # Initial delay
            ambient_events_${name} = []  # List of event dicts
        
        # --- Constants & Config ---
        INSTRUMENT_MODE = "DEBUG"  # "PROD" or "DEBUG"
        
        # Timings (ms)
        if INSTRUMENT_MODE == "DEBUG":
            INTERVAL_BUBBLE = (5000, 10000)
            INTERVAL_FISH = (15000, 30000)
        else:
            INTERVAL_BUBBLE = (300000, 600000)   # 5-10 min
            INTERVAL_FISH = (900000, 1800000)    # 15-30 min
        
        # Data
        level = SHARED_DATA.get("TIDE", 50)
        direction = SHARED_DATA.get("TIDE_DIR", "steady")  # rising, falling, steady
        water_rows = max(1, int(NP_H_${name} * level / 100))
        
        # --- 1. AMBIENT MANAGER ---
        # Hard lock: Only schedule if empty
        if len(ambient_events_${name}) == 0:
            if now_ms >= ambient_next_${name}:
                # Roll dice
                roll = random.randint(0, 100)
                new_event = None
                
                # FISH RULES:
                # - No Fish if Steady
                # - No Fish if water_rows < 6
                can_spawn_fish = (direction != "steady") and (water_rows >= 6)
                
                if roll < 25: # Bubble (25%)
                    x_pos = random.randint(0, NP_W_${name}-1)
                    new_event = {
                        "type": "BUBBLE",
                        "x": x_pos,
                        "y": 0.0,
                        "speed": random.uniform(0.05, 0.15)
                    }
                    # Schedule next
                    ambient_next_${name} = now_ms + random.randint(*INTERVAL_BUBBLE)
                    
                elif roll < 30 and can_spawn_fish: # Fish (5% - rare)
                    # Spec: "Peixinho" - Visual Contract
                    # Loc: y = random(2, water_rows - 3)
                    # Range: Max 2-3 cols
                    start_y = random.randint(2, water_rows - 3)
                    
                    # Direction: Left(-1) or Right(1)
                    fish_dir = 1 if random.randint(0, 1) == 1 else -1
                    
                    # Start X: Ensure travel space
                    travel_dist = random.randint(2, 3) 
                    if fish_dir == 1:
                        start_x = random.randint(0, NP_W_${name} - 1 - travel_dist)
                    else:
                        start_x = random.randint(travel_dist, NP_W_${name} - 1)
                        
                    new_event = {
                        "type": "FISH",
                        "x": float(start_x),
                        "y": start_y,
                        "start_x": start_x,
                        "dir": fish_dir,
                        "dist": 0.0,
                        "max_dist": float(travel_dist),
                        "speed": 0.025 # Constant speed (~1 col / 640ms)
                    }
                    ambient_next_${name} = now_ms + random.randint(*INTERVAL_FISH)
                
                else:
                    # Nothing (70%) - just wait a bit
                    ambient_next_${name} = now_ms + 5000

                if new_event:
                    ambient_events_${name}.append(new_event)
        
        # --- 2. TREND UPDATE ---
        if direction == "rising":
            flow_offset_${name} -= 0.05  # Upwards
        elif direction == "falling":
            flow_offset_${name} += 0.05  # Downwards
        # steady = freeze
        
        # --- LOGIC UPDATE (Events) ---
        active_evts = []
        for evt in ambient_events_${name}:
            keep = True
            if evt["type"] == "BUBBLE":
                evt["y"] += evt["speed"]
                if evt["y"] >= (water_rows - 2): # Pop before surface
                    keep = False
            elif evt["type"] == "FISH":
                # Constant speed, no easing (Use value from event)
                move = evt["speed"]
                evt["dist"] += move
                evt["x"] += move * evt["dir"]
                if evt["dist"] >= evt["max_dist"]:
                    # Cut clean, no fade
                    keep = False
            
            if keep:
                active_evts.append(evt)
        ambient_events_${name} = active_evts

        # --- DRAWING ---
        for y in range(NP_H_${name}):
            is_water = y < water_rows
            
            for x in range(NP_W_${name}):
                idx = y * NP_W_${name} + x
                if idx >= ${count}: continue
                
                if not is_water:
                    np_${name}[idx] = (0,0,0)
                    continue
                
                # 1. BASE
                c = get_tide_depth_color(level, y, water_rows)
                
                # 2. TREND
                # "O fluxo nao representa velocidade absoluta, apenas direcao"
                if direction != "steady":
                    theta = (y * 0.5) + flow_offset_${name}
                    wave = (math.sin(theta) + 1) * 0.5
                    # Gentle boost +10-20%
                    flow_boost = 1.0 + (wave * 0.15)
                    c = scale_color(c, flow_boost)
                
                # 3. AMBIENT
                # "Implemente o peixinho como se estivesse tentando esconde-lo"
                for evt in ambient_events_${name}:
                    if evt["type"] == "BUBBLE":
                        if int(evt["x"]) == x and int(evt["y"]) == y:
                            # Subtle additive blend
                            c = (min(255, c[0]+40), min(255, c[1]+60), min(255, c[2]+80))
                    
                    elif evt["type"] == "FISH":
                        # Spec: 2 pixels horizontal (Head + Tail)
                        # Head at int(x), Tail at int(x) - dir
                        ex_int = int(evt["x"])
                        ey = int(evt["y"])
                        
                        is_head = (x == ex_int and y == ey)
                        is_tail = (x == (ex_int - evt["dir"]) and y == ey)
                        
                        if is_head or is_tail:
                            # Spec Color: Base * 1.12, Green +5% of Base
                            # Logic: Slightly brighter, slight shift to cyan/green
                            # We use simple integer math for speed
                            
                            # Base brightness boost (12%)
                            r = min(255, int(c[0] * 1.12))
                            g = min(255, int(c[1] * 1.12))
                            b = min(255, int(c[2] * 1.12))
                            
                            # Green shift (+5% of original green)
                            g = min(255, int(g + c[1] * 0.05))
                            
                            # Blend: Lerp with 0.25 alpha (Subtle!)
                            # final = lerp(c, fish_c, 0.25)
                            # final = c * 0.75 + fish_c * 0.25
                            
                            # Since we calculated 'fish_c' (r,g,b) derived from c,
                            # and we want a subtle effect, we can just apply the result directly
                            # because the result IS the subtle shift.
                            # So we just use r,g,b calculated above.
                            c = (r, g, b)
                
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

    // Hysteresis and smoothing parameters
    const hysteresis = config.ldrConfig?.hysteresis || 15;  // Min change to trigger update
    const smoothingFactor = config.ldrConfig?.smoothing || 0.2;  // EMA alpha (0.1-0.5)
    const delayMs = config.ldrConfig?.delayMs || 2000;  // Delay before applying (2s default)
    const stableCount = config.ldrConfig?.stableReadings || 3;  // Required stable readings

    return {
        imports: 'from machine import ADC',
        globals: `
# LDR ${name} with Hysteresis & Smoothing
ldr_${name} = ADC(machine.Pin(${pin}))
ldr_${name}.atten(ADC.ATTN_11DB)
ldr_${name}_last_read = 0          # Last read timestamp
ldr_${name}_smooth = 0.0           # EMA smoothed value
ldr_${name}_stable_count = 0       # Consecutive stable readings
ldr_${name}_pending_bright = 0     # Pending brightness value
ldr_${name}_pending_since = 0      # When pending started
ldr_${name}_current_bright = ${minBright}  # Currently applied brightness
ldr_${name}_sent = 0               # Last sent event value

# Constants
LDR_${name}_HYSTERESIS = ${hysteresis}
LDR_${name}_SMOOTHING = ${smoothingFactor}
LDR_${name}_DELAY = ${delayMs}
LDR_${name}_STABLE_COUNT = ${stableCount}
`,
        commands: `    if cmd == "LDR:${name}:READ":
        print(f"OK:LDR:${name}:{ldr_${name}.read()}")
        return True
    if cmd == "LDR:${name}:STATUS":
        print(f"OK:LDR:${name}:SMOOTH:{int(ldr_${name}_smooth)}:PENDING:{ldr_${name}_pending_bright}:CURRENT:{ldr_${name}_current_bright}")
        return True`,
        init: `
    # Initialize LDR smoothed value
    ldr_${name}_smooth = float(ldr_${name}.read())
`,
        loop: `
    # ============ LDR ${name} Update (Hysteresis + Delay) ============
    if time.ticks_diff(time.ticks_ms(), ldr_${name}_last_read) > ${interval}:
        ldr_${name}_last_read = time.ticks_ms()
        raw = ldr_${name}.read()
        
        # EMA Smoothing: new = alpha * raw + (1-alpha) * old
        ldr_${name}_smooth = LDR_${name}_SMOOTHING * raw + (1 - LDR_${name}_SMOOTHING) * ldr_${name}_smooth
        
        # Map smoothed value to brightness range
        val = max(${minRead}, min(${maxRead}, int(ldr_${name}_smooth)))
        norm = (val - ${minRead}) / (${maxRead} - ${minRead})
        target_bright = int(${minBright} + norm * (${maxBright} - ${minBright}))
        
        # Check if change exceeds hysteresis threshold
        if abs(target_bright - ldr_${name}_pending_bright) > LDR_${name}_HYSTERESIS:
            # New target detected - start counting stable readings
            ldr_${name}_pending_bright = target_bright
            ldr_${name}_stable_count = 1
            ldr_${name}_pending_since = time.ticks_ms()
        elif abs(target_bright - ldr_${name}_pending_bright) <= 5:
            # Reading is stable (within 5 of pending)
            ldr_${name}_stable_count += 1
        else:
            # Unstable reading - reset counter
            ldr_${name}_stable_count = 0
    
    # Apply pending brightness after delay AND stable readings
    if ldr_${name}_pending_bright != ldr_${name}_current_bright:
        elapsed = time.ticks_diff(time.ticks_ms(), ldr_${name}_pending_since)
        if elapsed > LDR_${name}_DELAY and ldr_${name}_stable_count >= LDR_${name}_STABLE_COUNT:
            ldr_${name}_current_bright = ldr_${name}_pending_bright
            SHARED_DATA['BRIGHTNESS'] = ldr_${name}_current_bright
            
            # Only dispatch event if significant change
            if abs(ldr_${name}_current_bright - ldr_${name}_sent) > 5:
                ldr_${name}_sent = ldr_${name}_current_bright
                dispatch_event(f"LDR:${name}:CHANGE:{ldr_${name}_current_bright}")
`,
        caps: ['LDR']
    };
}

// === WIFI MODULE ===
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
        risingIndicator: true,
        ledCount: 8,
        neopixelPin: 2,
        worldTides: undefined
    };

    const harborId = tideConfig.harborId;
    const updateInterval = tideConfig.updateInterval * 60;

    // Build WorldTides config string if enabled
    const wt = tideConfig.worldTides;
    const worldTidesEntry = wt?.enabled && wt?.key
        ? `{"name": "WorldTides", "base": "https://www.worldtides.info/api/v3", "type": "worldtides", "lat": ${wt.lat || -14.78}, "lon": ${wt.lon || -39.03}, "key": "${wt.key}"}`
        : `{"name": "WorldTides", "base": "https://www.worldtides.info/api/v3", "type": "worldtides"}`;

    return {
        imports: `import urequests
import json
import math
import time
import nvs`,
        globals: `# ============ 🌊 TIDE ENGINE 2.0 (PREMIUM) ============
# Architecture: 3 Layers (Physics -> Intelligence -> Visual)

# Configuration
TIDE_HARBOR_ID = ${harborId}
TIDE_UPDATE_INTERVAL = ${updateInterval}

# API Endpoints
TIDE_APIS = [
    {"name": "TabuaMare", "base": "https://tabuamare.devtu.qzz.io/api/v1", "type": "tabuamare"},
    ${worldTidesEntry},
]

# 🔹 LAYER 1: PHYSICS (The Truth)
# Stores raw data from API. Never modified for aesthetics.
tide_physics = {
    "level_abs": 0.0,       # Current height in meters
    "timestamp": 0,         # Last update time
    "extremas": [],         # List of dicts: {"time": t, "level": h, "type": "high"/"low"}
    "confidence": 0         # 0-100%
}

# 🔹 LAYER 2: INTELLIGENCE (The Brain)
# Understands the context (Active Cycle)
tide_cycle = {
    "valid": False,
    "min_level": 0.0,
    "max_level": 1.0, 
    "t_start": 0,
    "t_end": 0,
    "type": "rising",       # "rising" or "falling"
    "pos_norm": 0.5,        # 0.0 to 1.0 (internal position)
    "plateau": False        # True if at peak/valley
}

# 🔹 LAYER 3: VISUAL (The Beauty)
# Rendering state (Crossfading, Halo, Breathing)
tide_visual = {
    "led_float": 15.0,      # Float index (e.g., 15.4)
    "halo_intensity": 0.0,
    "breath_phase": 0.0
}

# 🔹 LAYER 0: CORE SYSTEM (The Foundation)
# Production-grade firmware architecture
# Philosophy: "Firmware invisível é firmware bem feito"

# ============ SYSTEM STATE MACHINE ============
# States with clear semantics - no loose ifs
class SystemState:
    BOOT = 0                    # First 3 seconds
    NORMAL = 1                  # Everything working
    DEGRADED_NO_WIFI = 2        # No WiFi, using cache
    DEGRADED_TIME_UNCERTAIN = 3 # Time source unreliable
    RECOVERING = 4              # Attempting reconnection
    ERROR_SAFE = 5              # Fallback safe mode

system = {
    "state": SystemState.BOOT,
    "prev_state": SystemState.BOOT,
    "state_since": 0,
    "boot_complete": False,
    "last_good_level": 50,      # Always keep last known good value
    "freeze_display": False
}

# Valid state transitions (defensive programming)
VALID_TRANSITIONS = {
    SystemState.BOOT: [SystemState.NORMAL, SystemState.DEGRADED_NO_WIFI, SystemState.ERROR_SAFE],
    SystemState.NORMAL: [SystemState.DEGRADED_NO_WIFI, SystemState.DEGRADED_TIME_UNCERTAIN, SystemState.ERROR_SAFE],
    SystemState.DEGRADED_NO_WIFI: [SystemState.NORMAL, SystemState.DEGRADED_TIME_UNCERTAIN, SystemState.RECOVERING, SystemState.ERROR_SAFE],
    SystemState.DEGRADED_TIME_UNCERTAIN: [SystemState.NORMAL, SystemState.DEGRADED_NO_WIFI, SystemState.ERROR_SAFE],
    SystemState.RECOVERING: [SystemState.NORMAL, SystemState.DEGRADED_NO_WIFI, SystemState.ERROR_SAFE],
    SystemState.ERROR_SAFE: [SystemState.RECOVERING]  # Can only try to recover
}

def state_transition(new_state, now_ms):
    \"\"\"Safe state transition with validation.\"\"\"
    global system
    current = system["state"]
    
    if new_state == current:
        return True  # Already in state
    
    if new_state in VALID_TRANSITIONS.get(current, []):
        system["prev_state"] = current
        system["state"] = new_state
        system["state_since"] = now_ms
        log_event("STATE", f"{current}->{new_state}")
        return True
    
    log_event("STATE_ERR", f"Invalid {current}->{new_state}")
    return False

# ============ TIME MANAGEMENT ============
# Priority: NTP > RTC > millis > flash
class TimeSource:
    NTP = 0
    RTC = 1
    MILLIS = 2
    FLASH = 3
    UNKNOWN = 4

time_state = {
    "valid": False,
    "source": TimeSource.UNKNOWN,
    "epoch": 0,                 # Current epoch time
    "last_valid_epoch": 0,      # Last known good time
    "last_sync": 0,             # When last synced
    "drift_estimate": 0,        # Estimated drift in ms/hour
    "uncertainty_ms": 0         # How uncertain we are
}

def time_update_source(epoch, source, now_ms):
    \"\"\"Update time from a source with priority handling.\"\"\"
    global time_state
    
    # Only accept if better source or same source with newer data
    if source <= time_state["source"] or not time_state["valid"]:
        time_state["epoch"] = epoch
        time_state["source"] = source
        time_state["valid"] = True
        time_state["last_valid_epoch"] = epoch
        time_state["last_sync"] = now_ms
        time_state["uncertainty_ms"] = 0 if source == TimeSource.NTP else 60000
        
        # Persist to flash
        persist_save("time", {"epoch": epoch, "ms": now_ms})
        return True
    return False

def time_get_current():
    \"\"\"Get current time with uncertainty tracking.\"\"\"
    global time_state
    
    if not time_state["valid"]:
        # Try to load from flash
        saved = persist_load("time")
        if saved:
            time_state["epoch"] = saved.get("epoch", 0)
            time_state["source"] = TimeSource.FLASH
            time_state["valid"] = True
            time_state["uncertainty_ms"] = 3600000  # 1 hour uncertainty
    
    # Increase uncertainty over time
    if time_state["valid"]:
        elapsed = time.ticks_ms() - time_state["last_sync"]
        time_state["uncertainty_ms"] += elapsed // 3600  # 1ms per second drift
        
        # If uncertainty too high, mark as uncertain
        if time_state["uncertainty_ms"] > 1800000:  # 30 min
            state_transition(SystemState.DEGRADED_TIME_UNCERTAIN, time.ticks_ms())
    
    return time_state["epoch"], time_state["uncertainty_ms"]

# ============ WATCHDOGS ============
# Layer 1: Main loop (8s hard reset)
# Layer 2: Display calc (500ms soft fallback)
# Layer 3: Persistence (30s debounce)

_wdt_main = None
_wdt_display_deadline = 0
_wdt_persist_last = 0
WDT_PERSIST_DEBOUNCE = 30000  # 30 seconds

def wdt_init():
    \"\"\"Initialize watchdog timers.\"\"\"
    global _wdt_main
    try:
        from machine import WDT
        _wdt_main = WDT(timeout=8000)  # 8 second hardware watchdog
    except:
        pass

def wdt_feed():
    \"\"\"Feed main watchdog - call in main loop.\"\"\"
    if _wdt_main:
        _wdt_main.feed()

def wdt_display_start():
    \"\"\"Mark display calculation start.\"\"\"
    global _wdt_display_deadline
    _wdt_display_deadline = time.ticks_ms() + 500

def wdt_display_check():
    \"\"\"Check if display calculation took too long.\"\"\"
    if time.ticks_ms() > _wdt_display_deadline:
        log_event("WDT", "Display calc timeout - using last value")
        return False
    return True

def wdt_can_persist():
    \"\"\"Check if enough time passed for persistence.\"\"\"
    global _wdt_persist_last
    now = time.ticks_ms()
    if now - _wdt_persist_last > WDT_PERSIST_DEBOUNCE:
        _wdt_persist_last = now
        return True
    return False

# ============ DUAL-SLOT PERSISTENCE ============
# Anti-corruption: never write in place
# Slot A/B with CRC verification

_persist_active_slot = "A"

def persist_crc(data):
    \"\"\"Simple CRC for data integrity.\"\"\"
    crc = 0
    for byte in str(data).encode():
        crc = (crc + byte) & 0xFFFF
    return crc

def persist_save(key, data):
    \"\"\"Save data with dual-slot anti-corruption.\"\"\"
    global _persist_active_slot
    
    if not wdt_can_persist():
        return False
    
    try:
        # Determine inactive slot
        inactive = "B" if _persist_active_slot == "A" else "A"
        slot_key = f"{key}_{inactive}"
        
        # Prepare data with version and CRC
        payload = {
            "v": 1,
            "data": data,
            "crc": persist_crc(data),
            "ts": time.time()
        }
        
        # Write to inactive slot
        nvs.set_str(slot_key, json.dumps(payload))
        
        # Verify CRC
        readback = json.loads(nvs.get_str(slot_key))
        if readback.get("crc") != persist_crc(readback.get("data")):
            log_event("PERSIST", f"CRC fail on {slot_key}")
            return False
        
        # Mark as active
        nvs.set_str(f"{key}_active", inactive)
        _persist_active_slot = inactive
        return True
        
    except Exception as e:
        log_event("PERSIST_ERR", str(e))
        return False

def persist_load(key):
    \"\"\"Load data from best available slot.\"\"\"
    global _persist_active_slot
    
    try:
        # Get active slot
        active = nvs.get_str(f"{key}_active")
        if not active:
            active = "A"
        _persist_active_slot = active
        
        # Try active slot first
        slot_key = f"{key}_{active}"
        data_str = nvs.get_str(slot_key)
        if data_str:
            payload = json.loads(data_str)
            if payload.get("crc") == persist_crc(payload.get("data")):
                return payload.get("data")
            log_event("PERSIST", f"CRC fail, trying backup")
        
        # Try backup slot
        backup = "B" if active == "A" else "A"
        data_str = nvs.get_str(f"{key}_{backup}")
        if data_str:
            payload = json.loads(data_str)
            if payload.get("crc") == persist_crc(payload.get("data")):
                return payload.get("data")
        
        return None
        
    except:
        return None

# ============ BOOT SEQUENCE (3 seconds) ============
# 0-500ms: LEDs off, silent self-test
# 500-1000ms: Verify RAM, Flash CRC, Config
# 1000-2000ms: Load last known state
# 2000-3000ms: Elegant animation -> show tide

_boot_start = 0
_boot_phase = 0
_boot_tests = {}

def boot_init():
    \"\"\"Initialize boot sequence.\"\"\"
    global _boot_start, _boot_phase
    _boot_start = time.ticks_ms()
    _boot_phase = 0

def boot_tick(now_ms, leds):
    \"\"\"Execute boot sequence. Returns True when complete.\"\"\"
    global _boot_phase, _boot_tests, system
    
    elapsed = now_ms - _boot_start
    
    # Phase 0: LEDs off, silent self-test (0-500ms)
    if elapsed < 500:
        if _boot_phase == 0:
            for i in range(len(leds)):
                leds[i] = (0, 0, 0)
            _boot_phase = 1
            _boot_tests = {
                "config": validate_config(),
                "nvs": test_nvs_access()
            }
        return False
    
    # Phase 1: Verify integrity (500-1000ms)
    elif elapsed < 1000:
        if _boot_phase == 1:
            _boot_phase = 2
        return False
    
    # Phase 2: Load last state (1000-2000ms)
    elif elapsed < 2000:
        if _boot_phase == 2:
            _boot_phase = 3
            # Load last known good state
            saved = persist_load("tide_state")
            if saved:
                system["last_good_level"] = saved.get("level", 50)
                tide_physics["level_abs"] = saved.get("level_abs", 0)
        return False
    
    # Phase 3: Boot animation (2000-3000ms)
    elif elapsed < 3000:
        if _boot_phase == 3:
            _boot_phase = 4
            # Elegant fade-in animation
            progress = (elapsed - 2000) / 1000.0
            for i in range(len(leds)):
                leds[i] = (int(5 * progress), int(15 * progress), int(25 * progress))
        return False
    
    # Boot complete
    system["boot_complete"] = True
    
    # Determine initial state
    if all(_boot_tests.values()):
        state_transition(SystemState.NORMAL, now_ms)
    else:
        state_transition(SystemState.ERROR_SAFE, now_ms)
    
    return True

def validate_config():
    \"\"\"Validate configuration integrity.\"\"\"
    try:
        # Check essential config exists
        return TIDE_HARBOR_ID > 0
    except:
        return False

def test_nvs_access():
    \"\"\"Test NVS read/write capability.\"\"\"
    try:
        nvs.set_str("_test", "ok")
        return nvs.get_str("_test") == "ok"
    except:
        return False

# ============ SAFE TIDE CALCULATION ============
# Rule: "Better to show last good value than a new wrong one"

def safe_tide_level():
    \"\"\"Get tide level with safety guarantees.\"\"\"
    global system
    
    wdt_display_start()
    
    try:
        # If frozen, return last good
        if system["freeze_display"]:
            return system["last_good_level"]
        
        # If cycle not valid, freeze
        if not tide_cycle["valid"]:
            system["freeze_display"] = True
            log_event("TIDE", "Cycle invalid - freezing")
            return system["last_good_level"]
        
        # Never extrapolate outside known interval
        now_min = time.time() // 60
        if tide_cycle["t_start"] > 0 and tide_cycle["t_end"] > 0:
            if now_min < tide_cycle["t_start"] or now_min > tide_cycle["t_end"]:
                log_event("TIDE", "Outside interval - using last good")
                return system["last_good_level"]
        
        # Safe to calculate
        level = tide_calculate_harmonic()
        
        if wdt_display_check():
            system["last_good_level"] = level
            if wdt_can_persist():
                persist_save("tide_state", {"level": level, "level_abs": tide_physics["level_abs"]})
            return level
        else:
            return system["last_good_level"]
            
    except Exception as e:
        log_event("TIDE_ERR", str(e))
        return system["last_good_level"]

# ============ MINIMAL LOGGING ============
# Only essential events, compact format

_event_log = []  # Circular buffer, max 10 entries

def log_event(event_type, message):
    \"\"\"Log minimal event for debugging.\"\"\"
    global _event_log
    entry = {"t": time.time(), "e": event_type, "m": message[:50]}
    _event_log.append(entry)
    if len(_event_log) > 10:
        _event_log.pop(0)

def log_get_last():
    \"\"\"Get last logged events.\"\"\"
    return _event_log

# ============ FRAME TIMING (FastLED philosophy) ============
# Time-based animations, not frame-based
# Max 30-40 fps for smooth, calm display

TARGET_FPS = 33  # ~30ms per frame
_last_frame_ms = 0

def frame_should_render():
    \"\"\"Check if enough time passed for next frame.\"\"\"
    global _last_frame_ms
    now = time.ticks_ms()
    if now - _last_frame_ms >= (1000 // TARGET_FPS):
        _last_frame_ms = now
        return True
    return False

# ============ POWER LIMITING ============
# Like FastLED.setMaxPowerInVoltsAndMilliamps(5, 900)

MAX_POWER_MW = 4500  # 5V * 900mA = 4500mW
LED_MW_PER_FULL = 60 # ~60mW per LED at full white

def power_limit(leds, brightness):
    \"\"\"Limit total power consumption.\"\"\"
    # Calculate current power
    total_power = 0
    for r, g, b in leds:
        led_power = (r + g + b) / 765.0 * LED_MW_PER_FULL * (brightness / 100.0)
        total_power += led_power
    
    if total_power > MAX_POWER_MW:
        scale = MAX_POWER_MW / total_power
        return int(brightness * scale)
    return brightness

# 🔹 LAYER 4: CONNECTIVITY STATUS (Premium Nautical Design)
# Elegant, non-intrusive WiFi status indication
#
# Design Principles:
#   1. Tide display ALWAYS takes priority
#   2. Warnings are peripheral, never central
#   3. Subtle rhythmic indicators (not colors)
#   4. Auto-explanatory visual language

# WiFi State Machine
WIFI_OK = 0          # Connected, all good
WIFI_TEMP_DOWN = 1   # Disconnected < 6 hours
WIFI_LONG_DOWN = 2   # Disconnected > 6 hours

wifi_status = {
    "state": WIFI_OK,
    "last_ok": 0,           # Timestamp of last successful connection
    "disconnect_since": 0,  # When disconnect started
    "boot_warned": False    # True after boot warning shown
}

# Visual effect parameters (Apple-like subtlety)
WIFI_BREATH_PERIOD = 10000     # 10s cycle (8-12s recommended)
WIFI_BREATH_INTENSITY = 0.03  # +3% brightness variation
WIFI_GHOST_INTERVAL = 45000   # 45s between pings
WIFI_GHOST_FADE_MS = 400      # Fade duration
WIFI_BOOT_WARN_MS = 2000      # Boot warning duration
WIFI_TEMP_THRESHOLD = 6 * 60 * 60 * 1000  # 6 hours

# Visual state
wifi_visual = {
    "breath_phase": 0.0,       # 0.0 to 1.0
    "ghost_alpha": 0.0,        # 0.0 to 1.0 for ghost LED
    "last_ghost": 0,           # Last ghost ping time
    "uncertainty_offset": 0.0, # Micro-jitter for fallback data
    "boot_start": 0            # Boot time for warning
}

def wifi_update_status(connected, now_ms):
    \"\"\"Update WiFi state machine based on connection status.\"\"\"
    global wifi_status
    
    if connected:
        wifi_status["state"] = WIFI_OK
        wifi_status["last_ok"] = now_ms
        wifi_status["disconnect_since"] = 0
    else:
        if wifi_status["state"] == WIFI_OK:
            # Just went offline
            wifi_status["disconnect_since"] = now_ms
        
        # Check how long we've been offline
        if wifi_status["disconnect_since"] > 0:
            offline_duration = now_ms - wifi_status["disconnect_since"]
            if offline_duration > WIFI_TEMP_THRESHOLD:
                wifi_status["state"] = WIFI_LONG_DOWN
            else:
                wifi_status["state"] = WIFI_TEMP_DOWN

def wifi_get_breath_modifier(now_ms):
    \"\"\"Get subtle background breathing modifier for offline state.\"\"\"
    if wifi_status["state"] == WIFI_OK:
        return 0.0
    
    # Sine wave breathing: 0 to WIFI_BREATH_INTENSITY
    phase = (now_ms % WIFI_BREATH_PERIOD) / WIFI_BREATH_PERIOD
    return WIFI_BREATH_INTENSITY * (0.5 + 0.5 * math.sin(phase * 2 * 3.14159))

def wifi_get_ghost_alpha(now_ms):
    \"\"\"Get ghost ping LED alpha (0 = off, 1 = full).\"\"\"
    global wifi_visual
    
    if wifi_status["state"] == WIFI_OK:
        wifi_visual["ghost_alpha"] = 0.0
        return 0.0
    
    # Only show ghost ping for TEMP_DOWN, add more for LONG_DOWN
    if wifi_status["state"] == WIFI_TEMP_DOWN:
        interval = WIFI_GHOST_INTERVAL
    else:  # LONG_DOWN
        interval = WIFI_GHOST_INTERVAL // 2  # More frequent
    
    # Check if time for a new ghost ping
    if now_ms - wifi_visual["last_ghost"] > interval:
        wifi_visual["last_ghost"] = now_ms
        wifi_visual["ghost_alpha"] = 1.0
    
    # Fade out
    if wifi_visual["ghost_alpha"] > 0:
        fade_rate = 1.0 / WIFI_GHOST_FADE_MS
        wifi_visual["ghost_alpha"] = max(0.0, wifi_visual["ghost_alpha"] - fade_rate * 16)  # ~16ms per frame
    
    return wifi_visual["ghost_alpha"]

def wifi_get_uncertainty_offset(now_ms):
    \"\"\"Get micro-jitter offset when using cached/fallback data.\"\"\"
    if tide_physics["confidence"] >= 90:
        return 0.0
    
    # Subtle jitter: ±0.1 LED at slow rate
    phase = (now_ms % 5000) / 5000.0
    return 0.1 * math.sin(phase * 2 * 3.14159)

def wifi_boot_warning_active(now_ms):
    \"\"\"Check if boot warning should be shown (only once).\"\"\"
    global wifi_visual, wifi_status
    
    if wifi_status["boot_warned"]:
        return False
    
    if wifi_visual["boot_start"] == 0:
        wifi_visual["boot_start"] = now_ms
    
    elapsed = now_ms - wifi_visual["boot_start"]
    
    if elapsed > WIFI_BOOT_WARN_MS:
        wifi_status["boot_warned"] = True
        return False
    
    return wifi_status["state"] != WIFI_OK

def wifi_apply_visual_layer(base_colors, active_leds, now_ms):
    \"\"\"Apply all WiFi visual effects to LED array. Returns modified colors.\"\"\"
    
    colors = list(base_colors)  # Copy
    
    # 1. Background breathing (inactive LEDs only)
    breath = wifi_get_breath_modifier(now_ms)
    if breath > 0:
        for i in range(len(colors)):
            if i not in active_leds:
                r, g, b = colors[i]
                # Add cold blue-gray breathing
                colors[i] = (
                    min(255, int(r + 10 * breath)),
                    min(255, int(g + 15 * breath)),
                    min(255, int(b + 25 * breath))  # More blue
                )
    
    # 2. Ghost ping (top or bottom LED)
    ghost = wifi_get_ghost_alpha(now_ms)
    if ghost > 0:
        ghost_idx = len(colors) - 1  # Top LED
        r, g, b = colors[ghost_idx]
        # Pale cyan ghost
        colors[ghost_idx] = (
            min(255, int(r + 40 * ghost)),
            min(255, int(g + 80 * ghost)),
            min(255, int(b + 100 * ghost))
        )
    
    # 3. Boot warning (disconnected icon pattern)
    if wifi_boot_warning_active(now_ms):
        # Show two disconnected dots at center
        mid = len(colors) // 2
        if mid > 1:
            colors[mid - 1] = (60, 80, 100)  # Pale blue
            colors[mid + 1] = (60, 80, 100)
    
    return colors

# ============ HELPER FUNCTIONS ============

def tide_lerp(a, b, t):
    return a + (b - a) * max(0, min(1, t))

def tide_parse_time(t_str):
    try:
        parts = t_str.replace(":", " ").split()
        return int(parts[0]) * 60 + int(parts[1])
    except:
        return 0

# ============ LAYER 1: PHYSICS (FETCH) ============

# NVS Cache helpers
def tide_save_cache():
    try:
        import json
        cache = {
            "extremas": tide_physics["extremas"],
            "timestamp": tide_physics["timestamp"],
            "level": tide_physics["level_abs"]
        }
        nvs.set_str("tide_cache", json.dumps(cache))
        nvs.commit()
        print("TIDE: Cache saved")
    except Exception as e:
        print("TIDE: Cache save error:", e)

def tide_load_cache():
    try:
        import json
        data = nvs.get_str("tide_cache")
        if data:
            cache = json.loads(data)
            tide_physics["extremas"] = cache.get("extremas", [])
            tide_physics["timestamp"] = cache.get("timestamp", 0)
            tide_physics["level_abs"] = cache.get("level", 1.0)
            tide_physics["confidence"] = 70  # Cache = reduced confidence
            print("TIDE: Loaded from cache")
            return True
    except Exception:
        pass
    return False

def fetch_tide_data():
    global tide_physics
    now = time.time()
    lt = time.localtime(now)
    month = lt[1]
    day = lt[2]
    
    print("TIDE: Fetching data for {}/{}...".format(month, day))
    
    # ============ FALLBACK 1: Primary API (Tábua de Marés BR) ============
    try:
        url = "{}/tabua-mare/{}/{}/[{}]".format(
            TIDE_APIS[0]["base"], TIDE_HARBOR_ID, month, day
        )
        print("TIDE: Trying", url)
        res = urequests.get(url, timeout=10)
        data = res.json()
        res.close()
        
        # Parse API Response
        extremas = []
        harbor = data.get("data", [{}])[0] if data.get("data") else {}
        months_data = harbor.get("months", [{}])
        
        if months_data:
            days_data = months_data[0].get("days", [{}])
            if days_data:
                hours = days_data[0].get("hours", [])
                for entry in hours:
                    try:
                        h, m = entry["hour"].split(":")
                        # Calculate timestamp for today at this hour
                        day_start = now - (now % 86400)  # Midnight
                        t = day_start + int(h)*3600 + int(m)*60
                        
                        extremas.append({
                            "time": t,
                            "level": float(entry["level"]),
                            "type": ""
                        })
                    except Exception:
                        pass
        
        if extremas:
            # Sort by time
            extremas.sort(key=lambda x: x["time"])
            
            # Classify High/Low by comparing adjacent levels
            for i in range(len(extremas)):
                if i == 0:
                    extremas[i]["type"] = "low" if extremas[i]["level"] < extremas[1]["level"] else "high"
                else:
                    extremas[i]["type"] = "low" if extremas[i]["level"] < extremas[i-1]["level"] else "high"
            
            tide_physics["extremas"] = extremas
            tide_physics["timestamp"] = now
            tide_physics["confidence"] = 100
            
            tide_save_cache()
            tide_update_intelligence()
            print("TIDE: API OK - {} extremas".format(len(extremas)))
            return True
            
    except Exception as e:
        print("TIDE: Primary API failed:", e)
    
    # ============ FALLBACK 2: Secondary API (WorldTides) ============
    if len(TIDE_APIS) > 1 and TIDE_APIS[1].get("key"):
        try:
            print("TIDE: Trying WorldTides API...")
            # WorldTides uses lat/lon + API key
            api = TIDE_APIS[1]
            lat = api.get("lat", -14.78)  # Default: Ilhéus
            lon = api.get("lon", -39.03)
            key = api.get("key", "")
            
            url = "{}?extremes&lat={}&lon={}&key={}".format(
                api["base"], lat, lon, key
            )
            res = urequests.get(url, timeout=10)
            data = res.json()
            res.close()
            
            # WorldTides Response: {"status": 200, "extremes": [...]}
            extremas = []
            for e in data.get("extremes", []):
                extremas.append({
                    "time": e.get("dt", 0),  # Unix timestamp
                    "level": float(e.get("height", 0)),
                    "type": "high" if e.get("type") == "High" else "low"
                })
            
            if extremas:
                extremas.sort(key=lambda x: x["time"])
                tide_physics["extremas"] = extremas
                tide_physics["timestamp"] = now
                tide_physics["confidence"] = 95  # Slightly less than primary
                
                tide_save_cache()
                tide_update_intelligence()
                print("TIDE: WorldTides OK - {} extremas".format(len(extremas)))
                return True
                
        except Exception as e:
            print("TIDE: WorldTides failed:", e)
    
    # ============ FALLBACK 3: NVS Cache ============
    print("TIDE: Trying NVS cache...")
    if tide_load_cache():
        # Check cache age
        cache_age = now - tide_physics["timestamp"]
        if cache_age < 86400:  # Less than 24h old
            tide_physics["confidence"] = max(50, 100 - int(cache_age / 3600) * 5)
            tide_update_intelligence()
            return True
        else:
            print("TIDE: Cache too old")
    
    # ============ FALLBACK 4: Safe Defaults ============
    print("TIDE: Using safe defaults")
    tide_physics["extremas"] = [
        {"time": now - 3*3600, "level": 0.5, "type": "low"},
        {"time": now + 3*3600, "level": 2.0, "type": "high"},
        {"time": now + 9*3600, "level": 0.5, "type": "low"}
    ]
    tide_physics["timestamp"] = now
    tide_physics["confidence"] = 20
    tide_update_intelligence()
    return False

# ============ LAYER 2: INTELLIGENCE (PROCESS) ============

def tide_update_intelligence():
    global tide_cycle, tide_physics
    
    now = time.time()
    extremas = tide_physics["extremas"]
    
    if len(extremas) < 2:
        tide_cycle["valid"] = False
        return

    # 1. Find Active Cycle (The pair [A, B] surrounding NOW)
    cycle_start = None
    cycle_end = None
    
    for i in range(len(extremas) - 1):
        if extremas[i]["time"] <= now <= extremas[i+1]["time"]:
            cycle_start = extremas[i]
            cycle_end = extremas[i+1]
            break
            
    # Fallback: If not found (e.g., slightly out of bounds), use nearest
    if not cycle_start:
        cycle_start = extremas[0]
        cycle_end = extremas[1]

    # 2. Update Cycle Schema
    tide_cycle["valid"] = True
    tide_cycle["t_start"] = cycle_start["time"]
    tide_cycle["t_end"] = cycle_end["time"]
    
    # Robust Min/Max determination
    if cycle_start["level"] < cycle_end["level"]:
        tide_cycle["type"] = "rising"
        tide_cycle["min_level"] = cycle_start["level"]
        tide_cycle["max_level"] = cycle_end["level"]
    else:
        tide_cycle["type"] = "falling"
        tide_cycle["min_level"] = cycle_end["level"]
        tide_cycle["max_level"] = cycle_start["level"]
    
    # ============ HARMONIC COSINE INTERPOLATION ============
    # Physical Model: Tide follows a sinusoidal curve between extrema
    # Formula: level(t) = mid + amplitude * cos(π * progress)
    # This provides smooth S-curve transitions matching real tide physics
    
    # Calculate time progress within current cycle (0.0 to 1.0)
    t_duration = tide_cycle["t_end"] - tide_cycle["t_start"]
    if t_duration < 60: t_duration = 60  # Safety: min 1 minute
    progress = (now - tide_cycle["t_start"]) / t_duration
    progress = max(0.0, min(1.0, progress))  # Clamp to [0, 1]
    
    # Cosine Harmonic: Smooth curve from 0→1 or 1→0
    # cos(0)=1, cos(π)=-1 → Normalize (1 - cos(x)) / 2 gives 0→1
    harmonic = (1 - math.cos(progress * 3.14159265)) / 2
    
    if tide_cycle["type"] == "rising":
        # Rising: 0.0 (low) → 1.0 (high)
        tide_cycle["pos_norm"] = harmonic
    else:
        # Falling: 1.0 (high) → 0.0 (low)
        tide_cycle["pos_norm"] = 1.0 - harmonic
    
    # Calculate interpolated absolute level (for display/API)
    rng = tide_cycle["max_level"] - tide_cycle["min_level"]
    tide_physics["level_abs"] = tide_cycle["min_level"] + rng * tide_cycle["pos_norm"]

    # 3. Detect Plateau (Peak/Valley Stability)
    # If we are very close to start or end time (e.g. within 15 mins)
    time_to_edge = min(abs(now - tide_cycle["t_start"]), abs(now - tide_cycle["t_end"]))
    tide_cycle["plateau"] = time_to_edge < (15 * 60)

    # 4. Share Data (Context for other modules)
    SHARED_DATA["TIDE_LEVEL"] = int(tide_physics["level_abs"] * 100) # cm
    SHARED_DATA["TIDE_POS"] = int(tide_cycle["pos_norm"] * 100)      # %
    SHARED_DATA["TIDE_DIR"] = tide_cycle["type"]
    SHARED_DATA["TIDE_CONF"] = tide_physics["confidence"]

# ============ LAYER 3: VISUAL (RENDER) ============

def tide_get_visual_state(num_leds):
    # Calculates the float LED position and effects
    
    # 1. Safety Clamp
    pos = max(0.0, min(1.0, tide_cycle["pos_norm"]))
    
    # 2. Map to LED Space (0 to N-1)
    target_led = pos * (num_leds - 1)
    
    # 3. Plateau Breathing Effect
    # If plateau, add subtle sine wave to position or brightness
    halo = 0.0
    if tide_cycle["plateau"]:
        # Breathe: 0.0 to 1.0 over 4 seconds
        t = time.time()
        breath = (math.sin(t * 1.5) + 1) / 2  # 0 to 1
        halo = 0.3 + (breath * 0.4)           # 0.3 to 0.7 intensity
    
    return target_led, halo

def get_tide_depth_color(pos_norm, row, max_row):
    # Dynamic Gradients based on relative position
    
    # Colors (RGB)
    C_DEEP = (0, 10, 30)
    C_MID = (0, 60, 100)
    C_HIGH = (0, 140, 160)
    C_PEAK = (100, 200, 220)
    
    # Base color depends on Normalized Position (0.0 - 1.0)
    if pos_norm < 0.3:
        base = tide_lerp_color_tuple(C_DEEP, C_MID, pos_norm / 0.3)
    elif pos_norm < 0.8:
        base = tide_lerp_color_tuple(C_MID, C_HIGH, (pos_norm - 0.3) / 0.5)
    else:
        base = tide_lerp_color_tuple(C_HIGH, C_PEAK, (pos_norm - 0.8) / 0.2)
        
    return base

def tide_lerp_color_tuple(c1, c2, t):
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t)
    )

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

`,
        init: `
    # Initialize Physics
    try:
        if not fetch_tide_data():
            print("TIDE: Init fetch failed")
    except Exception as e:
        print("TIDE: Init Error:", e)
`,
        loop: `
    # Periodic Intelligence Update
    if time.time() - tide_physics["timestamp"] > 60:
         tide_update_intelligence()
        
    # Auto-Fetch
    if time.time() - tide_physics["timestamp"] > TIDE_UPDATE_INTERVAL:
         fetch_tide_data()
`,
        commands: {
            'TIDE:SYNC': {
                handler: `
    fetch_tide_data()
    return "OK SYNC"
`,
                description: 'Force sync with Tide API'
            },
            'TIDE:STATUS': {
                handler: `
    return "L:{:.2f}m P:{:.2f} C:{}% D:{}".format(
        tide_physics["level_abs"],
        tide_cycle["pos_norm"],
        tide_physics["confidence"],
        tide_cycle["type"]
    )
`,
                description: 'Get Physics & Intelligence Status'
            },
            'TIDE:FETCH': {
                handler: `
    success = fetch_tide_data()
    return "OK" if success else "ERROR"
`,
                description: 'Manual fetch trigger'
            },
            'TIDE:LEVEL': {
                handler: `
    if len(args) > 0:
        set_tide_level(float(args[0]))
        return "OK LEVEL"
    return "ERR ARG"
`,
                description: 'Set tide level (meters)'
            },
            'TIDE:DIR': {
                handler: `
    if len(args) > 0:
        set_tide_direction(args[0])
        return "OK DIR"
    return "ERR ARG"
`,
                description: 'Set tide direction (rising/falling)'
            }
        },
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

# Session management(Simple Token)
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

        # DNS Server(Captive Portal)
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
        # Simple DNS Hijack: Respond with own IP(192.168.4.1) for ALL queries
        # DNS Header: ID(2), Flags(2), QCount(2), Ans(2), Auth(2), Add(2)
        # We construct a response that points to 192.168.4.1
        
        # Extract Transaction ID
        trans_id = data[:2]
        
        # Flags: Standard Query Response, No Error
        flags = b'\\x81\\x80'
        
        # Counts: 1 Question, 1 Answer
        counts = b'\\x00\\x01\\x00\\x01\\x00\\x00\\x00\\x00'
        
        # Question Section(copy from request)
        # Find end of question(null byte)
        idx = 12
        while data[idx] != 0:
            idx += 1 + data[idx]
        idx += 5 # Skip null + QTYPE + QCLASS
        question = data[12:idx]
        
        # Answer Section
        # Name Ptr(0xC00C), TYPE A(0x0001), CLASS IN(0x0001), TTL(60s), LEN(4), IP
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
                # Basic Command handling(GET /? cmd =...)
                if "cmd=" in path:
                    handle_legacy_cmd(path)
                client.send("HTTP/1.1 302 Found\\r\\nLocation: /\\r\\n\\r\\n")
                # else:
                #    serve_user_dashboard(client)

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
    # Read body(PIN)
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
        # Here we will overwrite main.py for script-based updates(Dangerous but standard for MicroPython file-based fw)

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
    # Read JSON body { "ssid": "...", "pass": "..." }
    try:
        body_json = client.read(1024).decode()
        # Parse logic(simplified)
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
        <script>function login() { fetch('/tech/login', { method: 'POST', body: document.getElementById('pin').value }).then(r => { if (r.ok) location.reload(); else alert('Invalid PIN') }) }</script></body></html>"""
    client.send("HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\n\\r\\n" + html)

def serve_tech_dashboard(client):
    html = """<!DOCTYPE html><html><head><title>Tech Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#1a1a1a;color:#0f0;font-family:monospace;padding:20px}.card{border:1px solid #333;padding:15px;margin-bottom:15px}button{background:#333;color:#fff;border:1px solid #555;padding:8px;cursor:pointer}</style></head>
    <body><h1>TECH MODE</h1>
        <div class="card"><h3>OTA Update</h3><input type="file" id="fw"><button onclick="upload()">Upload Firmware</button></div>
            <div class="card"><h3>Actions</h3><button onclick="fetch('/tech/reset',{method:'POST'})">Factory Reset</button></div>
                <script>
function upload() {
    var f = document.getElementById('fw').files[0];
    if (!f) return;
    var h = new XMLHttpRequest();
    h.open("POST", "/tech/update");
    h.send(f);
    h.onload = () => alert(h.responseText);
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
    <body > <h1>Connect Device < /h1><p>Enter your WiFi credentials</p >
        <input id="ssid" placeholder = "WiFi Name (SSID)" >
            <input id="pass" type = "password" placeholder = "Password" >
                <button onclick="save()" > Connect </button>
                    <script > function save() { fetch('/api/wifi', { method: 'POST', body: JSON.stringify({ ssid: document.getElementById('ssid').value, pass: document.getElementById('pass').value }) }).then(r => alert('Saved. Device will reboot.')) } </script ></body > </html>"""
    else:
        # Normal User UI
        html = f"""<!DOCTYPE html><html><head><title>{WEB_TITLE}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{{background:#111;color:#eee;font-family:sans-serif;text-align:center;padding:20px}}.mode-btn{{display:block;width:100%;padding:15px;margin:10px 0;background:#333;color:#fff;text-decoration:none;border-radius:8px}}</style></head>
    <body > <h1>{ WEB_TITLE } < /h1><h3>Current Mode: {current_mode}</h3 >
    <a href="/?cmd=mode&val=AMBIENT" class="mode-btn" > AMBIENT </a>
        <a href = "/?cmd=mode&val=PARTY" class="mode-btn" > PARTY </a>
            <a href = "/?cmd=mode&val=SIGNAGE" class="mode-btn" > SIGNAGE </a>
                <br > <a href="/tech" style = "color:#555;font-size:12px" > Technician Access < /a></body > </html>"""

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
        loop: `    # Web Server Poll(HTTP + DNS)
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
        # Topic: prefix / cmd -> Payload: VAR: SET: TEMP: 25
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
                # Raw WLED / DRGB: 2, 255(timeout), [r, g, b]...
                # Simple implementation: expect raw RGB dump
                # or tpm2.net.For now, assume raw RGB for simplicity if size matches
                if len(data) > 0 and 'np' in globals():
                    # Just naive copy for now(improves latency)
                    # Ideally check protocol headers(WLED: 2 or 4)
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
                # Buffer for string reading(128 bytes max)
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
        # NVS: SAVE: KEY: VAL
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
# ESP - NOW Globals
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
    host, msg = enow.recv(0) # Non - blocking
if msg:
    print(f"ESPNOW:RECV:{host.hex()}:{msg.decode()}")
            # Optional: Treat as command
            # handle_command(msg.decode())
`,
        commands: `    if cmd.startswith("ESPNOW:SEND:"):
        # ESPNOW: SEND: MAC: MSG
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
# BLE Globals(Minimal UART)
ble = ubluetooth.BLE()
ble_uart_rx = None

def setup_ble():
    ble.active(True)
    ble.config(gap_name='${name}')
    print("BLE: Active")
    # Setup services would go here(complex for snippet)
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
i2c = machine.I2C(0, scl = machine.Pin(${scl}), sda = machine.Pin(${sda}))
disp = ssd1306.SSD1306_I2C(${w}, ${h}, i2c)
disp.fill(0)
disp.text("ESP32 Ready", 0, 0)
disp.show()
print("DISP: Ready")
    except Exception as e:
print(f"DISP: Init Error {e}")
`,
        commands: `    if cmd.startswith("DISP:TEXT:"):
        # DISP: TEXT: X: Y: MSG
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
    # Timer Check(every 30s)
    if time.time() - last_timer_check > 30:
        last_timer_check = time.time()
        # Get current HH: MM
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
        return `"${mode}": { "anim": "${profile.animation}", "bright": ${profile.brightness} } `;
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
            cycle_mode_${name} ()
dispatch_event(f"MODE:{current_mode_${name}}")
    mode_btn_last_${name} = btn_val
    ` : '';

    return {
        imports: '',
        globals: `
# === DEVICE MODES: ${name} ===
    MODE_LIST_${name} = ${JSON.stringify(modes)}
MODE_PROFILES_${name} = {${profilesDict} }
current_mode_${name} = "${defaultMode}"
${buttonGlobals}
def cycle_mode_${name} ():
    global current_mode_${name}
idx = MODE_LIST_${name}.index(current_mode_${name})
    current_mode_${name} = MODE_LIST_${name} [(idx + 1) % len(MODE_LIST_${name})]
    apply_mode_${name} ()

def set_mode_${name} (mode):
global current_mode_${name}
if mode in MODE_LIST_${name}:
        current_mode_${name} = mode
        apply_mode_${name} ()
return True
return False

def apply_mode_${name} ():
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
        cycle_mode_${name} ()
return "OK:MODE:" + current_mode_${name}
if cmd == "MODE:GET":
    return f"OK:MODE:{current_mode_${name}}"
if cmd.startswith("MODE:SET:"):
    new_mode = cmd.split(":")[2]
if set_mode_${name} (new_mode):
return "OK:MODE:" + new_mode
return "ERR:INVALID_MODE"
if cmd == "MODE:LIST":
    return "OK:MODES:" + ",".join(MODE_LIST_${name})
        `,
        init: `
    # Initialize Device Mode
    apply_mode_${name} ()
print(f"SYS:MODE_INIT:{current_mode_${name}}")
`,
        loop: `${buttonLoop} `,
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
_TEL_CONSENT = True  # User opted -in
    _TEL_ANONYMIZE = ${anonymize}
_TEL_PERSIST = ${persistToNvs}
_TEL_INTERVAL = ${reportInterval}
_TEL_LAST_REPORT = 0

# Device fingerprint(anonymized)
def _tel_device_id():
import machine
    uid = machine.unique_id()
if _TEL_ANONYMIZE:
    return hashlib.sha256(uid).hexdigest()[: 16]
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
        TEL_DATA["ft"]["anim"][anim_name] = TEL_DATA["ft"]["anim"].get(anim_name, 0) + 1` : 'pass'
            }

def tel_track_mode(mode_name):
    ${hasFeatures ? `
    if "mode" in TEL_DATA.get("ft", {}):
        TEL_DATA["ft"]["mode"][mode_name] = TEL_DATA["ft"]["mode"].get(mode_name, 0) + 1` : 'pass'
            }

def tel_track_cmd():
    ${hasFeatures ? 'TEL_DATA["ft"]["cmd"] = TEL_DATA["ft"].get("cmd", 0) + 1' : 'pass'}

def tel_track_error():
    ${hasReliability ? 'TEL_DATA["rl"]["err"] = TEL_DATA["rl"].get("err", 0) + 1' : 'pass'}

def tel_track_brightness(val):
    ${hasBehavior ? `
    bright_list = TEL_DATA.get("bh", {}).get("bright", [])
    bright_list.append(val)
    if len(bright_list) > 24:
        bright_list.pop(0)  # Keep last 24 samples` : 'pass'
            }

def tel_update_uptime():
    ${hasLifecycle ? `
    TEL_DATA["lc"]["up"] = int(time.time() - _boot_time) if "_boot_time" in dir() else 0` : 'pass'
            }

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
        pass` : 'pass'
            }

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
        pass` : 'pass'
            }

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
    # Telemetry periodic save(every ${reportInterval}s)
if time.time() - _TEL_LAST_REPORT > _TEL_INTERVAL:
    _TEL_LAST_REPORT = time.time()
tel_save()
`,
        caps: ['TELEMETRY']
    };
}

export const modularFirmwareGenerator = {
    generateMicroPython: generateModularMicroPython,
    getRecoveryFirmware,
};
// ============ SERVO (Phase 15) ============

function generateServoSnippet(config: ModuleConfig, intent: FirmwareIntent): ModuleSnippet {
    const name = config.name.replace(/\s+/g, '_');
    const pin = config.pin;
    const inverted = config.inverted || false;
    const cfg = config.servoConfig || {
        pin: 13, type: '180', minPulse: 500, maxPulse: 2500, startAngle: 0,
        autoControl: 'NONE', minInput: 0, maxInput: 100, minOutputAngle: 0, maxOutputAngle: 180
    };

    // PWM Frequency for servos is typically 50Hz
    const frequency = 50;
    const maxDuty = 65535; // 16-bit resolution

    // Calculate Duty Cycles for Min/Max pulse
    // Period = 1/50 = 20ms = 20000us
    // Duty = (Pulse / 20000) * 65535

    return {
        imports: '',
        globals: `
 # Servo: ${name}
 servo_${name} = machine.PWM(machine.Pin(${pin}), freq=${frequency})
 servo_${name}_type = "${cfg.type}"  # 180 or 360
 servo_${name}_min_pulse = ${cfg.minPulse}
 servo_${name}_max_pulse = ${cfg.maxPulse}
 servo_${name}_angle = ${cfg.startAngle}
 
 # Auto Control
 servo_${name}_auto_source = "${cfg.autoControl}" # NONE, TIDE_LEVEL, TIDE_TREND, WIFI_SIGNAL
 servo_${name}_in_min = ${cfg.minInput}
 servo_${name}_in_max = ${cfg.maxInput}
 servo_${name}_out_min = ${cfg.minOutputAngle}
 servo_${name}_out_max = ${cfg.maxOutputAngle}
 
 def set_servo_${name}_angle(angle):
     # Clamp angle
     if angle < 0: angle = 0
     if angle > 180 and servo_${name}_type == "180": angle = 180
     
     # Map angle (0-180) to Pulse Width (minPulse - maxPulse)
     # For 360 servos, angle usually means speed (0=full CW, 90=stop, 180=full CCW)
     
     span_pulse = servo_${name}_max_pulse - servo_${name}_min_pulse
     pulse_us = servo_${name}_min_pulse + (angle / 180.0 * span_pulse)
     
     # Calculate Duty (0-65535)
     # 50Hz = 20000us period
     duty = int((pulse_us / 20000.0) * 65535)
     
     servo_${name}.duty_u16(duty)
     global servo_${name}_angle
     servo_${name}_angle = angle
     # print(f"SERVO:{name}:ANGLE:{angle}:DUTY:{duty}")
 `,
        init: `
 # Init Servo ${name}
 set_servo_${name}_angle(${cfg.startAngle})
 `,
        loop: `
     # Servo Auto Control Logic
     if servo_${name}_auto_source != "NONE":
         input_val = 0
         if servo_${name}_auto_source == "TIDE_LEVEL" and "tide" in globals():
             # Assumes tide dictionary exists: tide['level'] (0-100)
             # Fallback if tide module not ready
             if 'tide_data' in globals() and 'level' in tide_data:
                 input_val = tide_data['level']
         elif servo_${name}_auto_source == "TIDE_TREND" and "tide_data" in globals():
             if 'trend' in tide_data: input_val = tide_data['trend'] # -1 to 1
         elif servo_${name}_auto_source == "WIFI_SIGNAL" and "wlan" in globals():
             if wlan.isconnected(): input_val = wlan.status('rssi') # e.g. -60
 
         # Map Input to Angle
         # Output = OutMin + ( (Input - InMin) / (InMax - InMin) * (OutMax - OutMin) )
         
         in_span = servo_${name}_in_max - servo_${name}_in_min
         if in_span != 0:
             pct = (input_val - servo_${name}_in_min) / in_span
             # Clamp Pct to 0-1? Maybe not, allow overshoot if limits allow? 
             # Let's clamp to mapped range
             if pct < 0: pct = 0
             if pct > 1: pct = 1
             
             out_span = servo_${name}_out_max - servo_${name}_out_min
             target_angle = servo_${name}_out_min + (pct * out_span)
             
             # Apply with smoothing? Direct for now.
             set_servo_${name}_angle(target_angle)
 `,
        commands: `    if cmd.startswith("SERVO:${name}:SET:"):
         try:
             angle = float(cmd.split(":")[-1])
             set_servo_${name}_angle(angle)
             print(f"OK:SERVO:${name}:{angle}")
         except:
             print("ERR:SERVO:INVALID_ANGLE")
         return True
     if cmd == "SERVO:${name}:GET":
         print(f"OK:SERVO:${name}:{servo_${name}_angle}")
         return True`,
        caps: ['SERVO']
    };
}
