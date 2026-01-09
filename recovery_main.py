import machine
import neopixel
import time
import sys
import uselect
import math
import random

# Firmware v1.7.0 - Advanced NeoPixel Animations
# Based on: uPixels, pi_pico_neopixel, jackw01/led-control
# Plataforma: MicroPython (ESP32)

print("SYS:READY:ESP32_GEN")

neopixels = {}
current_anim = None
anim_pin = None
anim_time = 0.0

# Global brightness (0.0 - 1.0) - Low by default
GLOBAL_BRIGHTNESS = 0.12

# Electriangle Fire heat array (1D linear)
fire_heat = [0] * 64

# Physics particles
particles = []

# Bounce/Chase state
bounce_pos = 0
bounce_dir = 1
chase_pos = 0

# ============ SEGMENT SYSTEM ============
# Each segment: {'id': int, 'start': int, 'end': int, 'anim': str, 'color': (r,g,b), 'speed': float}
segments = []
segment_counter = 0

def get_segment_by_id(seg_id):
    for seg in segments:
        if seg['id'] == seg_id:
            return seg
    return None

def create_segment(start, end, anim='RAINBOW', color=(255,255,255), speed=1.0):
    global segment_counter
    seg = {
        'id': segment_counter,
        'start': start,
        'end': end,
        'anim': anim,
        'color': color,
        'speed': speed,
        'state': 0  # Animation state
    }
    segments.append(seg)
    segment_counter += 1
    return seg['id']

def delete_segment(seg_id):
    global segments
    segments = [s for s in segments if s['id'] != seg_id]

def clear_segments():
    global segments
    segments = []

# ============ COLOR PALETTES ============
# Each palette is a list of RGB tuples for gradient interpolation
PALETTES = {
    'RAINBOW': [(255,0,0), (255,127,0), (255,255,0), (0,255,0), (0,0,255), (75,0,130), (148,0,211)],
    'OCEAN': [(0,0,64), (0,64,128), (0,128,192), (0,192,255), (64,224,255), (128,255,255)],
    'LAVA': [(0,0,0), (128,0,0), (255,0,0), (255,128,0), (255,255,0), (255,255,128)],
    'FOREST': [(0,32,0), (0,64,16), (0,128,32), (32,160,32), (64,192,64), (128,224,96)],
    'PARTY': [(255,0,128), (255,0,255), (128,0,255), (0,128,255), (0,255,128), (255,255,0)],
    'CLOUD': [(128,128,128), (160,160,180), (192,192,220), (224,224,240), (255,255,255)],
    'SUNSET': [(64,0,64), (128,0,64), (192,64,0), (255,128,0), (255,192,64), (255,224,128)],
    'FIRE': [(0,0,0), (64,0,0), (192,32,0), (255,96,0), (255,192,64), (255,255,192)],
    'ICE': [(0,0,64), (0,64,128), (64,128,192), (128,192,255), (192,224,255), (255,255,255)],
    'NEON': [(255,0,0), (255,0,255), (0,0,255), (0,255,255), (0,255,0), (255,255,0)],
    'PASTEL': [(255,182,193), (255,218,185), (255,255,186), (186,255,201), (186,225,255)],
    'HALLOWEEN': [(255,64,0), (128,0,128), (0,0,0), (255,128,0), (64,0,64)],
    'CHRISTMAS': [(255,0,0), (0,128,0), (255,255,255), (255,215,0), (0,100,0)],
    'AURORA': [(0,32,0), (0,128,64), (0,255,128), (64,255,192), (128,128,255), (64,0,128)],
    'MIAMI': [(255,0,128), (255,64,192), (128,0,255), (0,192,255), (0,255,192)],
    'CYBER': [(0,255,0), (0,192,0), (0,128,64), (0,64,128), (0,0,255)],
}

current_palette = 'RAINBOW'

def get_palette_color(palette_name, position):
    """Get interpolated color from palette at position 0.0-1.0"""
    pal = PALETTES.get(palette_name, PALETTES['RAINBOW'])
    position = max(0.0, min(1.0, position))
    
    if len(pal) == 1:
        return pal[0]
    
    # Find which segment of the palette we're in
    segment_count = len(pal) - 1
    scaled_pos = position * segment_count
    segment_idx = int(scaled_pos)
    segment_idx = min(segment_idx, segment_count - 1)
    local_pos = scaled_pos - segment_idx
    
    # Interpolate between two colors
    c1 = pal[segment_idx]
    c2 = pal[segment_idx + 1]
    
    r = int(c1[0] + (c2[0] - c1[0]) * local_pos)
    g = int(c1[1] + (c2[1] - c1[1]) * local_pos)
    b = int(c1[2] + (c2[2] - c1[2]) * local_pos)
    
    return (r, g, b)

def list_palettes():
    """Return list of available palette names"""
    return list(PALETTES.keys())

# ============ PRESETS SYSTEM ============
# Store up to 16 presets (0-15)
presets = {}
PRESETS_FILE = '/presets.json'

def get_current_state():
    """Capture current state for preset"""
    return {
        'anim': current_anim,
        'palette': current_palette,
        'brightness': int(GLOBAL_BRIGHTNESS * 100),
        'segments': [{'start': s['start'], 'end': s['end'], 'anim': s['anim']} for s in segments]
    }

def apply_preset(preset_data):
    """Apply preset state"""
    global current_anim, current_palette, GLOBAL_BRIGHTNESS, segments
    
    if 'anim' in preset_data and preset_data['anim']:
        current_anim = preset_data['anim']
    if 'palette' in preset_data:
        current_palette = preset_data['palette']
    if 'brightness' in preset_data:
        GLOBAL_BRIGHTNESS = preset_data['brightness'] / 100.0
    if 'segments' in preset_data:
        segments = []
        for seg_data in preset_data['segments']:
            create_segment(seg_data['start'], seg_data['end'], seg_data.get('anim', 'RAINBOW'))

def save_presets_to_file():
    """Persist presets to flash"""
    try:
        import json
        with open(PRESETS_FILE, 'w') as f:
            json.dump(presets, f)
        return True
    except:
        return False

def load_presets_from_file():
    """Load presets from flash"""
    global presets
    try:
        import json
        with open(PRESETS_FILE, 'r') as f:
            presets = json.load(f)
        return True
    except:
        presets = {}
        return False

# Try to load presets on boot
load_presets_from_file()

# Preset cycling state
preset_cycle_active = False
preset_cycle_interval = 5000  # ms
preset_cycle_index = 0
preset_cycle_next = 0

# ============ BACKLOG SYSTEM (Tasmota-inspired) ============
# Queue of commands to execute with optional delays
backlog_queue = []  # List of (command, delay_ms)
backlog_active = False
backlog_next_time = 0
MAX_BACKLOG = 30

def parse_backlog(cmd_string):
    """Parse backlog command string into queue"""
    global backlog_queue, backlog_active
    # Split by semicolon
    parts = cmd_string.split(';')
    queue = []
    current_delay = 0
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if part.upper().startswith('DELAY '):
            try:
                # Delay in deciseconds (100ms units) like Tasmota
                delay_val = int(part[6:].strip())
                current_delay = delay_val * 100  # Convert to ms
            except:
                current_delay = 0
        else:
            queue.append((part, current_delay))
            current_delay = 0  # Reset delay after use
    
    # Limit to MAX_BACKLOG
    return queue[:MAX_BACKLOG]

def start_backlog(commands):
    """Start executing backlog queue"""
    global backlog_queue, backlog_active, backlog_next_time
    backlog_queue = commands
    backlog_active = True
    backlog_next_time = time.ticks_ms()
    print(f"OK:BACKLOG:START:{len(commands)}")

def cancel_backlog():
    """Cancel current backlog"""
    global backlog_queue, backlog_active
    count = len(backlog_queue)
    backlog_queue = []
    backlog_active = False
    print(f"OK:BACKLOG:CANCEL:{count}")

def process_backlog():
    """Process next command in backlog if ready"""
    global backlog_queue, backlog_active, backlog_next_time
    
    if not backlog_active or not backlog_queue:
        backlog_active = False
        return None
    
    now = time.ticks_ms()
    if time.ticks_diff(now, backlog_next_time) >= 0:
        cmd, delay = backlog_queue.pop(0)
        backlog_next_time = time.ticks_add(now, delay)
        if not backlog_queue:
            backlog_active = False
            print("OK:BACKLOG:DONE")
        return cmd
    return None

# ============ Color Functions ============

def hsv_to_rgb(h, s, v):
    """HSV to RGB with 360° hue precision"""
    h = h % 360
    s = max(0, min(1, s))
    v = max(0, min(1, v))
    
    c = v * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = v - c
    
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    
    return (int((r + m) * 255), int((g + m) * 255), int((b + m) * 255))

def wheel(pos):
    """Rainbow color wheel (uPixels style)"""
    pos = pos % 256
    if pos < 85:
        return (255 - pos * 3, pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return (0, 255 - pos * 3, pos * 3)
    else:
        pos -= 170
        return (pos * 3, 0, 255 - pos * 3)

def fire_color(value):
    """DOOM fire gradient"""
    value = max(0, min(255, value))
    if value < 64:
        return (value * 4, 0, 0)
    elif value < 128:
        return (255, (value - 64) * 4, 0)
    elif value < 192:
        return (255, 255, (value - 128) * 4)
    else:
        return (255, 255, 255)

def apply_brightness(r, g, b):
    """Apply gamma correction for accurate brightness"""
    gamma = 2.2
    br = GLOBAL_BRIGHTNESS
    r_out = pow(r / 255, gamma) * br
    g_out = pow(g / 255, gamma) * br
    b_out = pow(b / 255, gamma) * br
    return (
        int(pow(r_out, 1/gamma) * 255),
        int(pow(g_out, 1/gamma) * 255),
        int(pow(b_out, 1/gamma) * 255)
    )

# ============ BITMAP FONT SYSTEM (3x5) ============
# Each character is 3 pixels wide, 5 pixels tall
# Stored as list of 5 bytes (one per row, 3 bits used)
FONT_3x5 = {
    'A': [0b010, 0b101, 0b111, 0b101, 0b101],
    'B': [0b110, 0b101, 0b110, 0b101, 0b110],
    'C': [0b011, 0b100, 0b100, 0b100, 0b011],
    'D': [0b110, 0b101, 0b101, 0b101, 0b110],
    'E': [0b111, 0b100, 0b110, 0b100, 0b111],
    'F': [0b111, 0b100, 0b110, 0b100, 0b100],
    'G': [0b011, 0b100, 0b101, 0b101, 0b011],
    'H': [0b101, 0b101, 0b111, 0b101, 0b101],
    'I': [0b111, 0b010, 0b010, 0b010, 0b111],
    'J': [0b001, 0b001, 0b001, 0b101, 0b010],
    'K': [0b101, 0b110, 0b100, 0b110, 0b101],
    'L': [0b100, 0b100, 0b100, 0b100, 0b111],
    'M': [0b101, 0b111, 0b101, 0b101, 0b101],
    'N': [0b101, 0b111, 0b111, 0b101, 0b101],
    'O': [0b010, 0b101, 0b101, 0b101, 0b010],
    'P': [0b110, 0b101, 0b110, 0b100, 0b100],
    'Q': [0b010, 0b101, 0b101, 0b111, 0b011],
    'R': [0b110, 0b101, 0b110, 0b101, 0b101],
    'S': [0b011, 0b100, 0b010, 0b001, 0b110],
    'T': [0b111, 0b010, 0b010, 0b010, 0b010],
    'U': [0b101, 0b101, 0b101, 0b101, 0b011],
    'V': [0b101, 0b101, 0b101, 0b010, 0b010],
    'W': [0b101, 0b101, 0b101, 0b111, 0b101],
    'X': [0b101, 0b101, 0b010, 0b101, 0b101],
    'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
    'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
    '0': [0b010, 0b101, 0b101, 0b101, 0b010],
    '1': [0b010, 0b110, 0b010, 0b010, 0b111],
    '2': [0b110, 0b001, 0b010, 0b100, 0b111],
    '3': [0b110, 0b001, 0b010, 0b001, 0b110],
    '4': [0b101, 0b101, 0b111, 0b001, 0b001],
    '5': [0b111, 0b100, 0b110, 0b001, 0b110],
    '6': [0b011, 0b100, 0b110, 0b101, 0b010],
    '7': [0b111, 0b001, 0b010, 0b010, 0b010],
    '8': [0b010, 0b101, 0b010, 0b101, 0b010],
    '9': [0b010, 0b101, 0b011, 0b001, 0b110],
    ' ': [0b000, 0b000, 0b000, 0b000, 0b000],
    '.': [0b000, 0b000, 0b000, 0b000, 0b010],
    ':': [0b000, 0b010, 0b000, 0b010, 0b000],
    '!': [0b010, 0b010, 0b010, 0b000, 0b010],
    '-': [0b000, 0b000, 0b111, 0b000, 0b000],
}

# Text state
text_buffer = ""
text_color = (255, 255, 255)
text_scroll_offset = 0
text_scroll_active = False
text_scroll_speed = 1  # pixels per frame

def draw_char(np, char, x_offset, y_offset, color, matrix_width=8, matrix_height=8):
    """Draw a single character at position with given color"""
    char = char.upper()
    if char not in FONT_3x5:
        char = ' '
    
    glyph = FONT_3x5[char]
    for row in range(5):
        for col in range(3):
            if glyph[row] & (0b100 >> col):  # Check bit from left
                px = x_offset + col
                py = y_offset + row
                if 0 <= px < matrix_width and 0 <= py < matrix_height:
                    # Calculate pixel index (assume row-major)
                    idx = py * matrix_width + px
                    if idx < len(np):
                        np[idx] = color

def draw_text(np, text, x_offset, y_offset, color, matrix_width=8, matrix_height=8):
    """Draw text string starting at position"""
    cursor_x = x_offset
    for char in text:
        draw_char(np, char, cursor_x, y_offset, color, matrix_width, matrix_height)
        cursor_x += 4  # 3px char + 1px spacing

def get_text_width(text):
    """Get pixel width of text string"""
    return len(text) * 4 - 1  # 3px per char + 1px spacing, minus last spacing

def interpolate_rgb(c1, c2, t):
    """Linear interpolation between two colors"""
    t = max(0, min(1, t))
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t)
    )

# Wave functions from led-control
def wave_sine(t):
    """Sine wave 0-1 range"""
    return (math.cos(6.283 * t) / 2.0) + 0.5

def wave_triangle(t):
    """Triangle wave"""
    return abs(2 * (t % 1) - 1)

def plasma_sines(x, y, t, cx, cy, cxy, cmag):
    """Plasma effect using multiple sine waves"""
    v = math.sin((x + t) * cx)
    v += math.sin((y + t) * cy)
    v += math.sin((x + y + t) * cxy)
    v += math.sin((math.sqrt(x*x + y*y) + t) * cmag)
    return v

# Modern palette
PALETTE = [
    (255, 107, 129), (255, 159, 67), (254, 216, 67),
    (0, 210, 211), (72, 219, 251), (162, 155, 254),
    (255, 121, 198), (46, 213, 115)
]

# ============ Animation Initializers ============

def init_fire():
    global fire_heat
    fire_heat = [0] * 64

def init_particles(count=6):
    global particles
    particles = []
    for _ in range(count):
        particles.append({
            'x': random.uniform(0, 7),
            'y': random.uniform(0, 3),
            'vx': random.uniform(-0.15, 0.15),
            'vy': random.uniform(-0.3, 0.1),
            'hue': random.randint(0, 360)
        })

# ============ Command Handler ============

def handle_command(cmd):
    global current_anim, anim_pin, anim_time, GLOBAL_BRIGHTNESS, bounce_pos, chase_pos
    cmd = cmd.strip()
    
    if cmd == "SYS:HELLO":
        print("SYS:HELLO:ESP32_GEN")
        print("OK:DEVICE=ESP32_GEN;FW=2.5.0;CAPS=GPIO,NEO,ANIM,SEGMENTS,PALETTES,PRESETS,BACKLOG,TEXT,HWIO")
        return
    
    if cmd.startswith("BRIGHT:"):
        try:
            val = int(cmd.split(":")[1])
            GLOBAL_BRIGHTNESS = max(0, min(100, val)) / 100.0
            print(f"OK:BRIGHT:{val}")
        except:
            print("ERR:BRIGHT:INVALID")
        return
    
    # ============ LOW-LEVEL GPIO COMMAND ============
    # GPIO:pin:MODE:IN/OUT/IN_PULL
    # GPIO:pin:HIGH/LOW/READ
    if cmd.startswith("GPIO:"):
        try:
            parts = cmd.split(":")
            pin_num = int(parts[1])
            action = parts[2].upper()
            
            if action == "MODE":
                mode_str = parts[3].upper() if len(parts) > 3 else "OUT"
                if mode_str == "IN":
                    machine.Pin(pin_num, machine.Pin.IN)
                elif mode_str == "IN_PULL":
                    machine.Pin(pin_num, machine.Pin.IN, machine.Pin.PULL_UP)
                else:
                    machine.Pin(pin_num, machine.Pin.OUT)
                print(f"OK:GPIO:{pin_num}:MODE:{mode_str}")
            elif action == "HIGH":
                machine.Pin(pin_num, machine.Pin.OUT).value(1)
                print(f"OK:GPIO:{pin_num}:HIGH")
            elif action == "LOW":
                machine.Pin(pin_num, machine.Pin.OUT).value(0)
                print(f"OK:GPIO:{pin_num}:LOW")
            elif action == "READ":
                val = machine.Pin(pin_num, machine.Pin.IN).value()
                print(f"OK:GPIO:{pin_num}:READ:{val}")
            elif action == "TOGGLE":
                p = machine.Pin(pin_num, machine.Pin.OUT)
                p.value(1 - p.value())
                print(f"OK:GPIO:{pin_num}:TOGGLE:{p.value()}")
            else:
                print(f"ERR:GPIO:UNKNOWN_ACTION:{action}")
        except Exception as e:
            print(f"ERR:GPIO:{e}")
        return
    
    # ============ PWM COMMAND ============
    # PWM:pin:freq:duty (duty 0-1023)
    # PWM:pin:STOP
    if cmd.startswith("PWM:"):
        try:
            parts = cmd.split(":")
            pin_num = int(parts[1])
            
            if parts[2].upper() == "STOP":
                pwm = machine.PWM(machine.Pin(pin_num))
                pwm.deinit()
                print(f"OK:PWM:{pin_num}:STOP")
            else:
                freq = int(parts[2])
                duty = int(parts[3]) if len(parts) > 3 else 512
                pwm = machine.PWM(machine.Pin(pin_num))
                pwm.freq(freq)
                pwm.duty(duty)
                print(f"OK:PWM:{pin_num}:{freq}:{duty}")
        except Exception as e:
            print(f"ERR:PWM:{e}")
        return
    
    # ============ ADC COMMAND ============
    # ADC:pin - Read analog value (0-4095 on ESP32)
    if cmd.startswith("ADC:"):
        try:
            parts = cmd.split(":")
            pin_num = int(parts[1])
            adc = machine.ADC(machine.Pin(pin_num))
            adc.atten(machine.ADC.ATTN_11DB)  # Full range 0-3.3V
            value = adc.read()
            voltage = value * 3.3 / 4095
            print(f"OK:ADC:{pin_num}:{value}:{voltage:.2f}V")
        except Exception as e:
            print(f"ERR:ADC:{e}")
        return
    
    # ============ DAC COMMAND ============
    # DAC:pin:value (value 0-255 for 8-bit DAC)
    if cmd.startswith("DAC:"):
        try:
            parts = cmd.split(":")
            pin_num = int(parts[1])
            value = int(parts[2])
            dac = machine.DAC(machine.Pin(pin_num))
            dac.write(value)
            voltage = value * 3.3 / 255
            print(f"OK:DAC:{pin_num}:{value}:{voltage:.2f}V")
        except Exception as e:
            print(f"ERR:DAC:{e}")
        return
    
    if cmd.startswith("NEO:"):
        try:
            parts = cmd.split(":")
            
            if len(parts) >= 3 and parts[2] == "CLEAR":
                pin_num = int(parts[1])
                if pin_num in neopixels:
                    neopixels[pin_num].fill((0,0,0))
                    neopixels[pin_num].write()
                current_anim = None
                print(f"OK:NEO:{parts[1]}:CLEAR")
                return

            if len(parts) >= 4 and parts[2] == "ANIM":
                anim_type = parts[3]
                pin_num = int(parts[1])
                
                if pin_num not in neopixels:
                    p = machine.Pin(pin_num, machine.Pin.OUT)
                    neopixels[pin_num] = neopixel.NeoPixel(p, 64)
                
                anim_pin = pin_num
                anim_time = 0.0
                bounce_pos = 0
                chase_pos = 0
                
                animations = ["FIRE", "PARTICLE", "RAINBOW", "PLASMA", "AURORA", 
                             "WAVE", "FISH", "SPARKLE", "BOUNCE", "CHASE", 
                             "GRADIENT", "BREATHE", "COMET"]
                
                if anim_type in animations:
                    current_anim = anim_type
                    if anim_type == "FIRE":
                        init_fire()
                    elif anim_type == "PARTICLE":
                        init_particles(6)
                    print(f"OK:NEO:{pin_num}:ANIM:{anim_type}")
                else:
                    print(f"ERR:NEO:UNKNOWN_ANIM:{anim_type}")
                return

            if len(parts) >= 4:
                current_anim = None
                pin_num = int(parts[1])
                idx = int(parts[2])
                color_str = parts[3]
                r, g, b = map(int, color_str.split(","))
                
                if pin_num not in neopixels:
                    p = machine.Pin(pin_num, machine.Pin.OUT)
                    neopixels[pin_num] = neopixel.NeoPixel(p, 64)
                
                np_obj = neopixels[pin_num]
                if 0 <= idx < 64:
                    r, g, b = apply_brightness(r, g, b)
                    np_obj[idx] = (r, g, b)
                    np_obj.write()
                    print(f"OK:NEO:{pin_num}:{idx}:{r},{g},{b}")
                else:
                    print(f"ERR:NEO:IDX_OUT_OF_RANGE:{idx}")
                
        except Exception as e:
            print(f"ERR:NEO:{e}")
        return
    
    # ============ SEGMENT COMMANDS ============
    if cmd.startswith("SEG:"):
        try:
            parts = cmd.split(":")
            sub_cmd = parts[1].upper()
            
            # SEG:CREATE:start:end:animation
            if sub_cmd == "CREATE" and len(parts) >= 4:
                start = int(parts[2])
                end = int(parts[3])
                anim = parts[4].upper() if len(parts) > 4 else "RAINBOW"
                
                if start >= end:
                    print("ERR:SEG:START_MUST_BE_LESS_THAN_END")
                    return
                
                seg_id = create_segment(start, end, anim)
                print(f"OK:SEG:CREATE:{seg_id}:{start}:{end}:{anim}")
                return
            
            # SEG:DELETE:id
            if sub_cmd == "DELETE" and len(parts) >= 3:
                seg_id = int(parts[2])
                if get_segment_by_id(seg_id):
                    delete_segment(seg_id)
                    print(f"OK:SEG:DELETE:{seg_id}")
                else:
                    print(f"ERR:SEG:NOT_FOUND:{seg_id}")
                return
            
            # SEG:LIST
            if sub_cmd == "LIST":
                if len(segments) == 0:
                    print("OK:SEG:LIST:EMPTY")
                else:
                    seg_list = ";".join([f"{s['id']}:{s['start']}-{s['end']}:{s['anim']}" for s in segments])
                    print(f"OK:SEG:LIST:{seg_list}")
                return
            
            # SEG:CLEAR
            if sub_cmd == "CLEAR":
                clear_segments()
                print("OK:SEG:CLEAR")
                return
            
            # SEG:SET:id:anim
            if sub_cmd == "SET" and len(parts) >= 4:
                seg_id = int(parts[2])
                anim = parts[3].upper()
                seg = get_segment_by_id(seg_id)
                if seg:
                    seg['anim'] = anim
                    print(f"OK:SEG:SET:{seg_id}:{anim}")
                else:
                    print(f"ERR:SEG:NOT_FOUND:{seg_id}")
                return
            
            print(f"ERR:SEG:UNKNOWN_SUBCMD:{sub_cmd}")
        except Exception as e:
            print(f"ERR:SEG:{e}")
        return
    
    # ============ PALETTE COMMANDS ============
    if cmd.startswith("PAL:"):
        global current_palette
        try:
            parts = cmd.split(":")
            sub_cmd = parts[1].upper()
            
            # PAL:SET:name
            if sub_cmd == "SET" and len(parts) >= 3:
                pal_name = parts[2].upper()
                if pal_name in PALETTES:
                    current_palette = pal_name
                    print(f"OK:PAL:SET:{pal_name}")
                else:
                    print(f"ERR:PAL:NOT_FOUND:{pal_name}")
                return
            
            # PAL:LIST
            if sub_cmd == "LIST":
                pal_list = ",".join(list_palettes())
                print(f"OK:PAL:LIST:{pal_list}")
                return
            
            # PAL:GET (current)
            if sub_cmd == "GET":
                print(f"OK:PAL:GET:{current_palette}")
                return
            
            print(f"ERR:PAL:UNKNOWN_SUBCMD:{sub_cmd}")
        except Exception as e:
            print(f"ERR:PAL:{e}")
        return
    
    # ============ PRESET COMMANDS ============
    if cmd.startswith("PRESET:"):
        try:
            parts = cmd.split(":")
            sub_cmd = parts[1].upper()
            
            # PRESET:SAVE:id[:name]
            if sub_cmd == "SAVE" and len(parts) >= 3:
                preset_id = parts[2]
                preset_name = parts[3] if len(parts) > 3 else f"Preset {preset_id}"
                presets[preset_id] = {
                    'name': preset_name,
                    'state': get_current_state()
                }
                if save_presets_to_file():
                    print(f"OK:PRESET:SAVE:{preset_id}:{preset_name}")
                else:
                    print(f"OK:PRESET:SAVE:{preset_id}:NOSAVE")
                return
            
            # PRESET:LOAD:id
            if sub_cmd == "LOAD" and len(parts) >= 3:
                preset_id = parts[2]
                if preset_id in presets:
                    apply_preset(presets[preset_id]['state'])
                    print(f"OK:PRESET:LOAD:{preset_id}")
                else:
                    print(f"ERR:PRESET:NOT_FOUND:{preset_id}")
                return
            
            # PRESET:LIST
            if sub_cmd == "LIST":
                if len(presets) == 0:
                    print("OK:PRESET:LIST:EMPTY")
                else:
                    preset_list = ";".join([f"{k}:{presets[k].get('name', k)}" for k in presets])
                    print(f"OK:PRESET:LIST:{preset_list}")
                return
            
            # PRESET:DELETE:id
            if sub_cmd == "DELETE" and len(parts) >= 3:
                preset_id = parts[2]
                if preset_id in presets:
                    del presets[preset_id]
                    save_presets_to_file()
                    print(f"OK:PRESET:DELETE:{preset_id}")
                else:
                    print(f"ERR:PRESET:NOT_FOUND:{preset_id}")
                return
            
            # PRESET:CLEAR - Delete all presets
            if sub_cmd == "CLEAR":
                presets.clear()
                save_presets_to_file()
                print("OK:PRESET:CLEAR")
                return
            
            # PRESET:CYCLE:interval - Auto-cycle presets (interval in seconds, 0 = stop)
            if sub_cmd == "CYCLE":
                global preset_cycle_active, preset_cycle_interval, preset_cycle_index, preset_cycle_next
                interval = int(parts[2]) if len(parts) >= 3 else 0
                if interval <= 0:
                    preset_cycle_active = False
                    print("OK:PRESET:CYCLE:STOP")
                else:
                    preset_cycle_active = True
                    preset_cycle_interval = interval * 1000  # Convert to ms
                    preset_cycle_index = 0
                    preset_cycle_next = time.ticks_ms()
                    print(f"OK:PRESET:CYCLE:START:{interval}s:{len(presets)}_presets")
                return
            
            print(f"ERR:PRESET:UNKNOWN_SUBCMD:{sub_cmd}")
        except Exception as e:
            print(f"ERR:PRESET:{e}")
        return
    
    # ============ BACKLOG COMMAND ============
    if cmd.startswith("BACKLOG ") or cmd == "BACKLOG":
        if cmd == "BACKLOG":
            # Empty backlog cancels current queue
            cancel_backlog()
            return
        
        # Parse and start backlog
        backlog_str = cmd[8:]  # Remove "BACKLOG "
        commands = parse_backlog(backlog_str)
        if commands:
            start_backlog(commands)
        else:
            print("ERR:BACKLOG:EMPTY")
        return
    
    # ============ TEXT COMMAND ============
    # TEXT:message:R,G,B or TEXT:message (white)
    # TEXT:SCROLL:message:speed:R,G,B
    if cmd.startswith("TEXT:"):
        global text_buffer, text_color, text_scroll_active, text_scroll_offset, text_scroll_speed
        try:
            parts = cmd.split(":")
            if len(parts) >= 2:
                if parts[1].upper() == "SCROLL" and len(parts) >= 3:
                    # Scroll mode: TEXT:SCROLL:message:speed:R,G,B
                    text_buffer = parts[2]
                    text_scroll_speed = int(parts[3]) if len(parts) > 3 else 1
                    if len(parts) > 4:
                        rgb = parts[4].split(",")
                        text_color = (int(rgb[0]), int(rgb[1]), int(rgb[2]))
                    else:
                        text_color = (255, 255, 255)
                    text_scroll_active = True
                    text_scroll_offset = 8  # Start off-screen right
                    print(f"OK:TEXT:SCROLL:{text_buffer}")
                elif parts[1].upper() == "STOP":
                    text_scroll_active = False
                    text_buffer = ""
                    print("OK:TEXT:STOP")
                else:
                    # Static text: TEXT:message:R,G,B
                    text_buffer = parts[1]
                    if len(parts) > 2:
                        rgb = parts[2].split(",")
                        text_color = (int(rgb[0]), int(rgb[1]), int(rgb[2]))
                    else:
                        text_color = (255, 255, 255)
                    text_scroll_active = False
                    text_scroll_offset = 0
                    print(f"OK:TEXT:{text_buffer}")
        except Exception as e:
            print(f"ERR:TEXT:{e}")
        return
    
    print("ERR:UNKNOWN_CMD")

spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)

def read_input():
    if spoll.poll(0):
        return sys.stdin.readline()
    return None

# Physics constant
GRAVITY = 0.08

# ============ Segment Animation Renderer ============
def render_segment(seg, np, t):
    """Render animation for a single segment"""
    start = seg['start']
    end = seg['end']
    anim = seg['anim']
    seg_len = end - start
    
    if seg_len <= 0:
        return
    
    if anim == "RAINBOW":
        for i in range(start, end):
            local_i = i - start
            hue = ((local_i * 360 / seg_len) + t * 60) % 360
            r, g, b = hsv_to_rgb(hue, 1.0, 1.0)
            r, g, b = apply_brightness(r, g, b)
            np[i] = (r, g, b)
    
    elif anim == "SOLID":
        color = seg.get('color', (255, 255, 255))
        r, g, b = apply_brightness(color[0], color[1], color[2])
        for i in range(start, end):
            np[i] = (r, g, b)
    
    elif anim == "CHASE":
        for i in range(start, end):
            local_i = i - start
            pos = (int(t * 20) + local_i) % seg_len
            if pos < 3:  # Trail length
                hue = ((local_i * 360 / seg_len) + t * 100) % 360
                r, g, b = hsv_to_rgb(hue, 1.0, 1.0)
                r, g, b = apply_brightness(r, g, b)
                np[i] = (r, g, b)
            else:
                np[i] = (0, 0, 0)
    
    elif anim == "GRADIENT":
        for i in range(start, end):
            local_i = i - start
            ratio = local_i / max(1, seg_len - 1)
            hue = (ratio * 180 + t * 30) % 360
            r, g, b = hsv_to_rgb(hue, 1.0, 0.8)
            r, g, b = apply_brightness(r, g, b)
            np[i] = (r, g, b)
    
    elif anim == "BREATHE":
        brightness = (math.sin(t * 2) + 1) / 2 * GLOBAL_BRIGHTNESS
        color = seg.get('color', (255, 100, 50))
        r = int(color[0] * brightness)
        g = int(color[1] * brightness)
        b = int(color[2] * brightness)
        for i in range(start, end):
            np[i] = (r, g, b)
    
    elif anim == "FIRE":
        # Simplified fire for segments
        for i in range(start, end):
            local_i = i - start
            heat_val = random.randint(100, 255) if local_i < 3 else random.randint(0, 180)
            t192 = (heat_val * 191) // 255
            heatramp = (t192 & 0x3F) << 2
            if t192 > 0x80:
                r, g, b = 255, 255, heatramp
            elif t192 > 0x40:
                r, g, b = 255, heatramp, 0
            else:
                r, g, b = heatramp, 0, 0
            r, g, b = apply_brightness(r, g, b)
            np[i] = (r, g, b)
    
    elif anim == "SPARKLE":
        # Fade + random sparkle
        for i in range(start, end):
            r, g, b = np[i]
            np[i] = (int(r * 0.9), int(g * 0.9), int(b * 0.9))
        spark_idx = start + random.randint(0, max(0, seg_len - 1))
        r, g, b = apply_brightness(255, 255, 255)
        np[spark_idx] = (r, g, b)
    
    elif anim == "PALETTE":
        # Use current palette for animated gradient
        for i in range(start, end):
            local_i = i - start
            # Animate through palette
            pos = ((local_i / seg_len) + t * 0.1) % 1.0
            r, g, b = get_palette_color(current_palette, pos)
            r, g, b = apply_brightness(r, g, b)
            np[i] = (r, g, b)
    
    else:
        # Unknown animation - solid off
        for i in range(start, end):
            np[i] = (0, 0, 0)

# Main Loop
last_time = time.ticks_ms()

while True:
    now = time.ticks_ms()
    dt = time.ticks_diff(now, last_time) / 1000.0
    last_time = now
    anim_time += dt
    
    cmd = read_input()
    if cmd:
        handle_command(cmd)
    
    # Process backlog queue
    backlog_cmd = process_backlog()
    if backlog_cmd:
        handle_command(backlog_cmd)
    
    # Process preset cycling
    if preset_cycle_active and len(presets) > 0:
        if time.ticks_diff(now, preset_cycle_next) >= 0:
            preset_keys = list(presets.keys())
            if preset_keys:
                preset_id = preset_keys[preset_cycle_index % len(preset_keys)]
                apply_preset(presets[preset_id]['state'])
                preset_cycle_index = (preset_cycle_index + 1) % len(preset_keys)
                preset_cycle_next = time.ticks_add(now, preset_cycle_interval)
    
    # ============ RENDER TEXT ============
    if text_buffer and anim_pin is not None and anim_pin in neopixels:
        np = neopixels[anim_pin]
        np.fill((0, 0, 0))  # Clear for text
        
        # Calculate text position
        text_width = get_text_width(text_buffer)
        
        if text_scroll_active:
            # Scroll text from right to left
            x_pos = text_scroll_offset
            draw_text(np, text_buffer, x_pos, 1, text_color)
            text_scroll_offset -= text_scroll_speed
            # Reset when fully scrolled off left
            if text_scroll_offset < -text_width:
                text_scroll_offset = 8
        else:
            # Center static text
            x_pos = max(0, (8 - text_width) // 2)
            draw_text(np, text_buffer, x_pos, 1, text_color)
        
        np.write()
    
    # ============ RENDER SEGMENTS ============
    elif len(segments) > 0 and anim_pin is not None and anim_pin in neopixels:
        np = neopixels[anim_pin]
        for seg in segments:
            render_segment(seg, np, anim_time)
        np.write()
    
    # ============ LEGACY SINGLE ANIMATION ============
    elif current_anim and anim_pin is not None and anim_pin in neopixels:
        np = neopixels[anim_pin]

        # ============ RAINBOW ============
        if current_anim == "RAINBOW":
            for i in range(64):
                hue = ((i * 360 / 64) + anim_time * 60) % 360
                r, g, b = hsv_to_rgb(hue, 1.0, 1.0)
                r, g, b = apply_brightness(r, g, b)
                np[i] = (r, g, b)
            np.write()

        # ============ ELECTRIANGLE FIRE ============
        elif current_anim == "FIRE":
            # Electriangle Fire algorithm
            # https://github.com/Electriangle/Fire_Main
            num_leds = len(np)
            flame_height = 50  # Higher = shorter flames
            sparks = 120       # Ignition probability (0-255)
            
            # Cool down each cell
            for i in range(num_leds):
                cooldown = random.randint(0, ((flame_height * 10) // num_leds) + 2)
                if cooldown > fire_heat[i]:
                    fire_heat[i] = 0
                else:
                    fire_heat[i] = fire_heat[i] - cooldown
            
            # Heat drifts up and diffuses
            for k in range(num_leds - 1, 1, -1):
                fire_heat[k] = (fire_heat[k - 1] + fire_heat[k - 2] + fire_heat[k - 2]) // 3
            
            # Randomly ignite sparks at the bottom
            if random.randint(0, 255) < sparks:
                y = random.randint(0, 6)
                fire_heat[y] = min(255, fire_heat[y] + random.randint(160, 255))
            
            # Convert heat to LED colors
            for j in range(num_leds):
                # Rescale heat from 0-255 to 0-191
                t192 = (fire_heat[j] * 191) // 255
                heatramp = (t192 & 0x3F) << 2  # 0-252
                
                if t192 > 0x80:        # Hottest - white/yellow
                    r, g, b = 255, 255, heatramp
                elif t192 > 0x40:      # Middle - orange
                    r, g, b = 255, heatramp, 0
                else:                   # Coolest - red
                    r, g, b = heatramp, 0, 0
                
                r, g, b = apply_brightness(r, g, b)
                np[j] = (r, g, b)
            np.write()

        # ============ SPARKLE (from uPixels) ============
        elif current_anim == "SPARKLE":
            # Fade existing
            for i in range(64):
                r, g, b = np[i]
                np[i] = (int(r * 0.85), int(g * 0.85), int(b * 0.85))
            # Add new sparkles
            for _ in range(3):
                idx = random.randint(0, 63)
                color = PALETTE[random.randint(0, len(PALETTE) - 1)]
                r, g, b = apply_brightness(color[0], color[1], color[2])
                np[idx] = (r, g, b)
            np.write()

        # ============ BOUNCE (from uPixels) ============
        elif current_anim == "BOUNCE":
            np.fill((0,0,0))
            # Two bouncing balls
            pos1 = abs(int(math.sin(anim_time * 2) * 7))
            pos2 = abs(int(math.sin(anim_time * 2.7 + 1) * 7))
            for row in range(8):
                idx1 = row * 8 + pos1
                idx2 = row * 8 + pos2
                r1, g1, b1 = apply_brightness(255, 107, 129)
                r2, g2, b2 = apply_brightness(72, 219, 251)
                np[idx1] = (r1, g1, b1)
                np[idx2] = (r2, g2, b2)
            np.write()

        # ============ CHASE (from uPixels) ============
        elif current_anim == "CHASE":
            np.fill((0,0,0))
            chase_len = 5
            pos = int(anim_time * 15) % 64
            for i in range(chase_len):
                idx = (pos + i) % 64
                fade = 1 - (i / chase_len)
                hue = (anim_time * 50 + i * 10) % 360
                r, g, b = hsv_to_rgb(hue, 1.0, fade)
                r, g, b = apply_brightness(r, g, b)
                np[idx] = (r, g, b)
            np.write()

        # ============ GRADIENT (from pi_pico_neopixel) ============
        elif current_anim == "GRADIENT":
            # Animated gradient across matrix
            c1_idx = int(anim_time * 0.5) % len(PALETTE)
            c2_idx = (c1_idx + 4) % len(PALETTE)
            c1 = PALETTE[c1_idx]
            c2 = PALETTE[c2_idx]
            for i in range(64):
                t = (i / 63 + anim_time * 0.1) % 1
                r, g, b = interpolate_rgb(c1, c2, t)
                r, g, b = apply_brightness(r, g, b)
                np[i] = (r, g, b)
            np.write()

        # ============ BREATHE (pulsing brightness) ============
        elif current_anim == "BREATHE":
            brightness = (math.sin(anim_time * 2) + 1) / 2 * 0.9 + 0.1
            hue = (anim_time * 30) % 360
            r, g, b = hsv_to_rgb(hue, 0.8, brightness * GLOBAL_BRIGHTNESS * 8)
            r, g, b = max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))
            np.fill((r, g, b))
            np.write()

        # ============ COMET (trail effect) ============
        elif current_anim == "COMET":
            np.fill((0,0,0))
            comet_len = 8
            pos = int(anim_time * 12) % 72
            hue = (anim_time * 40) % 360
            for i in range(comet_len):
                idx = pos - i
                if 0 <= idx < 64:
                    fade = 1 - (i / comet_len)
                    r, g, b = hsv_to_rgb(hue, 1.0, fade)
                    r, g, b = apply_brightness(r, g, b)
                    np[idx] = (r, g, b)
            np.write()

        # ============ PLASMA (from led-control) ============
        elif current_anim == "PLASMA":
            for y in range(8):
                for x in range(8):
                    v = plasma_sines(x * 0.5, y * 0.5, anim_time, 1.0, 0.5, 0.5, 1.0)
                    # Map to color
                    r = int((0.8 - wave_sine(v)) * 255)
                    g = int((wave_sine(v + 0.333) - 0.2) * 255)
                    b = int((0.8 - wave_sine(v + 0.666)) * 255)
                    r, g, b = max(0, r), max(0, g), max(0, b)
                    r, g, b = apply_brightness(r, g, b)
                    np[y * 8 + x] = (r, g, b)
            np.write()

        # ============ AURORA ============
        elif current_anim == "AURORA":
            np.fill((0,0,0))
            for x in range(8):
                wave1 = math.sin(x * 0.8 + anim_time * 0.5) * 2 + 4
                wave2 = math.sin(x * 0.5 + anim_time * 0.7 + 2) * 1.5 + 3.5
                for y in range(8):
                    d1 = abs(y - wave1)
                    d2 = abs(y - wave2)
                    i1 = max(0, 1 - d1 / 2.5)
                    i2 = max(0, 1 - d2 / 2.5)
                    r = int(i2 * 200)
                    g = int(i1 * 255 + i2 * 100)
                    b = int(i1 * 220 + i2 * 255)
                    r, g, b = apply_brightness(r, g, b)
                    np[y * 8 + x] = (r, g, b)
            np.write()

        # ============ WAVE ============
        elif current_anim == "WAVE":
            np.fill((0,0,0))
            for x in range(8):
                wave = math.sin((x + anim_time * 2) * 0.8) * 3 + 3.5
                for y in range(8):
                    dist = abs(y - wave)
                    if dist < 2:
                        intensity = 1 - dist / 2
                        c = PALETTE[int(x + anim_time * 2) % len(PALETTE)]
                        r = int(c[0] * intensity)
                        g = int(c[1] * intensity)
                        b = int(c[2] * intensity)
                        r, g, b = apply_brightness(r, g, b)
                        np[y * 8 + x] = (r, g, b)
            np.write()

        # ============ PARTICLE (Physics) ============
        elif current_anim == "PARTICLE":
            np.fill((0,0,0))
            for p in particles:
                p['vy'] += GRAVITY
                p['x'] += p['vx']
                p['y'] += p['vy']
                if p['x'] < 0:
                    p['x'] = 0
                    p['vx'] = -p['vx'] * 0.8
                elif p['x'] >= 7.5:
                    p['x'] = 7.5
                    p['vx'] = -p['vx'] * 0.8
                if p['y'] >= 7:
                    p['y'] = 7
                    p['vy'] = -p['vy'] * 0.6
                    p['vx'] *= 0.9
                    if abs(p['vy']) < 0.1:
                        p['x'] = random.uniform(0, 7)
                        p['y'] = random.uniform(-2, 0)
                        p['vx'] = random.uniform(-0.15, 0.15)
                        p['vy'] = random.uniform(-0.3, 0.1)
                        p['hue'] = (p['hue'] + 60) % 360
                if p['y'] < 0:
                    p['y'] = 0
                    p['vy'] = -p['vy'] * 0.5
                p['hue'] = (p['hue'] + 0.3) % 360
                x_int = int(p['x'])
                y_int = int(p['y'])
                if 0 <= x_int < 8 and 0 <= y_int < 8:
                    r, g, b = hsv_to_rgb(p['hue'], 1.0, 1.0)
                    r, g, b = apply_brightness(r, g, b)
                    np[y_int * 8 + x_int] = (r, g, b)
            np.write()

        # ============ FISH ============
        elif current_anim == "FISH":
            np.fill((0,0,0))
            items = [
                (0, 2, 0, 100, 255), (1, 2, 0, 150, 255), (2, 2, 0, 200, 255),
                (0, 3, 0, 120, 255), (1, 3, 50, 255, 100), (2, 3, 100, 255, 50), (3, 3, 255, 150, 0),
                (0, 4, 0, 100, 255), (1, 4, 0, 150, 255), (2, 4, 0, 200, 255),
                (4, 3, 255, 50, 50)
            ]
            x_shift = int(7 - (anim_time * 3) % 16)
            for (fx, fy, r, g, b) in items:
                x = (fx + x_shift) % 8
                if 0 <= fy < 8:
                    r, g, b = apply_brightness(r, g, b)
                    np[fy * 8 + x] = (r, g, b)
            np.write()
            
    time.sleep(0.016)  # ~60 FPS
