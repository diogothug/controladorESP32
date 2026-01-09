import { ModuleConfig, AnimationType } from '../shared/types';

export class FirmwareGenerator {

    generateArduino(modules: ModuleConfig[]): string {
        let setupCode = '';
        let loopCode = '';
        let commandHandlerCode = '';
        let pinDefinitions = '';
        let hasNeoPixel = false;
        let neoPixelVars: string[] = [];
        let defaultAnimation = 'NONE';
        let defaultPixelCount = 64;
        let defaultBrightness = 30;

        // Check for NeoPixel modules
        modules.forEach(mod => {
            if (mod.type === 'NEOPIXEL') {
                hasNeoPixel = true;
                if (mod.neoPixelConfig) {
                    defaultAnimation = mod.neoPixelConfig.defaultAnimation || 'NONE';
                    defaultPixelCount = mod.neoPixelConfig.pixelCount || 64;
                    defaultBrightness = mod.neoPixelConfig.brightness || 30;
                }
            }
        });

        // Standard Boilerplate
        const header = `
/* 
 * Firmware Gerado Automaticamente 
 * Plataforma: Arduino/C++
 * FW Version: 2.2.0
 */
#include <Arduino.h>
${hasNeoPixel ? '#include <Adafruit_NeoPixel.h>' : ''}

String inputString = "";
boolean stringComplete = false;

${hasNeoPixel ? `
// Animation state
String currentAnim = "${defaultAnimation}";
unsigned long animTime = 0;
int animFrame = 0;

// Color wheel helper
uint32_t Wheel(Adafruit_NeoPixel& strip, byte WheelPos) {
  WheelPos = 255 - WheelPos;
  if(WheelPos < 85) {
    return strip.Color(255 - WheelPos * 3, 0, WheelPos * 3);
  }
  if(WheelPos < 170) {
    WheelPos -= 85;
    return strip.Color(0, WheelPos * 3, 255 - WheelPos * 3);
  }
  WheelPos -= 170;
  return strip.Color(WheelPos * 3, 255 - WheelPos * 3, 0);
}
` : ''}

// Forward declarations
void handleCommand(String command);
`;

        // Process Modules
        modules.forEach(mod => {
            const safeName = mod.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const pinVar = `PIN_${safeName}`;

            pinDefinitions += `#define ${pinVar} ${mod.pin}\n`;

            if (mod.type === 'LED') {
                setupCode += `  pinMode(${pinVar}, OUTPUT);\n  digitalWrite(${pinVar}, LOW);\n`;

                commandHandlerCode += `
  if (command.startsWith("LED:${safeName}:")) {
    if (command.endsWith(":ON")) {
      digitalWrite(${pinVar}, HIGH);
      Serial.println("OK:LED:${safeName}:ON");
    } else if (command.endsWith(":OFF")) {
      digitalWrite(${pinVar}, LOW);
      Serial.println("OK:LED:${safeName}:OFF");
    }
    return;
  }
`;
            } else if (mod.type === 'NEOPIXEL' && mod.neoPixelConfig) {
                const config = mod.neoPixelConfig;
                const neoVarName = `neo_${safeName}`;
                const pixelCount = config.pixelCount || 64;
                neoPixelVars.push(neoVarName);

                pinDefinitions += `#define ${safeName}_COUNT ${pixelCount}\n`;
                pinDefinitions += `Adafruit_NeoPixel ${neoVarName}(${safeName}_COUNT, ${pinVar}, NEO_GRB + NEO_KHZ800);\n`;

                setupCode += `  ${neoVarName}.begin();\n`;
                setupCode += `  ${neoVarName}.setBrightness(${Math.round((config.brightness || 30) * 2.55)});\n`;
                setupCode += `  ${neoVarName}.show();\n`;

                commandHandlerCode += `
  // NeoPixel commands for ${safeName}
  if (command.startsWith("NEO:${mod.pin}:")) {
    String subCmd = command.substring(${String(mod.pin).length + 5});
    
    if (subCmd == "CLEAR") {
      ${neoVarName}.clear();
      ${neoVarName}.show();
      currentAnim = "NONE";
      Serial.println("OK:NEO:${mod.pin}:CLEAR");
      return;
    }
    
    if (subCmd.startsWith("ANIM:")) {
      currentAnim = subCmd.substring(5);
      animFrame = 0;
      Serial.println("OK:NEO:${mod.pin}:ANIM:" + currentAnim);
      return;
    }
    
    if (subCmd.startsWith("FILL:")) {
      int r, g, b;
      sscanf(subCmd.substring(5).c_str(), "%d,%d,%d", &r, &g, &b);
      ${neoVarName}.fill(${neoVarName}.Color(r, g, b));
      ${neoVarName}.show();
      currentAnim = "NONE";
      Serial.println("OK:NEO:${mod.pin}:FILL");
      return;
    }
    
    if (subCmd.startsWith("BRIGHT:")) {
      int bright = subCmd.substring(7).toInt();
      ${neoVarName}.setBrightness(bright * 255 / 100);
      ${neoVarName}.show();
      Serial.println("OK:NEO:${mod.pin}:BRIGHT:" + String(bright));
      return;
    }
  }
`;
                // Animation loop for this strip
                loopCode += `
  // Animation loop for ${safeName}
  if (millis() - animTime > 30) {  // ~33 FPS
    animTime = millis();
    
    if (currentAnim == "RAINBOW") {
      for(int i=0; i<${neoVarName}.numPixels(); i++) {
        ${neoVarName}.setPixelColor(i, Wheel(${neoVarName}, (i + animFrame) & 255));
      }
      ${neoVarName}.show();
      animFrame = (animFrame + 1) % 256;
    }
    else if (currentAnim == "CHASE") {
      ${neoVarName}.clear();
      for(int i=0; i<3; i++) {
        int pos = (animFrame + i) % ${neoVarName}.numPixels();
        ${neoVarName}.setPixelColor(pos, Wheel(${neoVarName}, animFrame));
      }
      ${neoVarName}.show();
      animFrame = (animFrame + 1) % ${neoVarName}.numPixels();
    }
    else if (currentAnim == "SPARKLE") {
      for(int i=0; i<${neoVarName}.numPixels(); i++) {
        uint32_t c = ${neoVarName}.getPixelColor(i);
        uint8_t r = (c >> 16) * 0.9;
        uint8_t g = (c >> 8) * 0.9;
        uint8_t b = c * 0.9;
        ${neoVarName}.setPixelColor(i, r, g, b);
      }
      int sparkle = random(${neoVarName}.numPixels());
      ${neoVarName}.setPixelColor(sparkle, 255, 255, 255);
      ${neoVarName}.show();
    }
  }
`;
            }
        });

        const setup = `
void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }
  inputString.reserve(200);
  
${setupCode}
  Serial.println("SYS:READY:ARDUINO_GEN;FW=2.2.0;CAPS=GPIO,NEO,ANIM");
}
`;

        const loop = `
void loop() {
  if (stringComplete) {
    inputString.trim();
    handleCommand(inputString);
    inputString = "";
    stringComplete = false;
  }
${loopCode}
}

void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\\n') {
      stringComplete = true;
    }
  }
}
`;

        const commandHandler = `
void handleCommand(String command) {
  if (command == "SYS:HELLO") {
    Serial.println("SYS:HELLO:ARDUINO_GEN");
    Serial.println("OK:DEVICE=ARDUINO_GEN;FW=2.2.0;CAPS=GPIO,NEO,ANIM");
    return;
  }
  
${commandHandlerCode}

  Serial.println("ERR:UNKNOWN_CMD");
}
`;

        return header + pinDefinitions + setup + loop + commandHandler;
    }

    generateMicroPython(modules: ModuleConfig[]): string {
        // Find default animation from NeoPixel modules
        let defaultAnimation: AnimationType = 'NONE';
        let defaultBrightness = 12;
        let defaultPixelCount = 64;
        let defaultPin = 2;

        modules.forEach(mod => {
            if (mod.type === 'NEOPIXEL' && mod.neoPixelConfig) {
                defaultAnimation = mod.neoPixelConfig.defaultAnimation || 'NONE';
                defaultBrightness = mod.neoPixelConfig.brightness || 12;
                defaultPixelCount = mod.neoPixelConfig.pixelCount || 64;
                defaultPin = mod.pin;
            }
        });

        // Build LED module initialization
        let ledInitCode = '';
        let ledCommandCode = '';

        modules.forEach(mod => {
            const safeName = mod.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            if (mod.type === 'LED') {
                ledInitCode += `${safeName} = machine.Pin(${mod.pin}, machine.Pin.OUT)\n`;
                ledInitCode += `${safeName}.value(0)\n`;
                ledCommandCode += `
    if cmd.startswith("LED:${safeName}:"):
        if cmd.endswith(":ON"):
            ${safeName}.value(1)
            print("OK:LED:${safeName}:ON")
        elif cmd.endswith(":OFF"):
            ${safeName}.value(0)
            print("OK:LED:${safeName}:OFF")
        return
`;
            }
        });

        const code = `import machine
import neopixel
import time
import sys
import uselect
import math
import random

# Firmware Gerado Automaticamente
# Plataforma: MicroPython (ESP32)
# Versão: 2.0.0 - Full Animation Support

print("SYS:READY:ESP32_GEN")

neopixels = {}
current_anim = None
anim_pin = None
anim_time = 0.0

# Global brightness (0.0 - 1.0)
GLOBAL_BRIGHTNESS = ${(defaultBrightness / 100).toFixed(2)}

# Electriangle Fire heat array (1D linear)
fire_heat = [0] * ${defaultPixelCount}

# Physics particles
particles = []

# Bounce/Chase state
bounce_pos = 0
bounce_dir = 1
chase_pos = 0

# LED Module Init
${ledInitCode}

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
    fire_heat = [0] * ${defaultPixelCount}

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
    
${ledCommandCode}

    if cmd.startswith("BRIGHT:"):
        try:
            val = int(cmd.split(":")[1])
            GLOBAL_BRIGHTNESS = max(0, min(100, val)) / 100.0
            print(f"OK:BRIGHT:{val}")
        except:
            print("ERR:BRIGHT:INVALID")
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
                    neopixels[pin_num] = neopixel.NeoPixel(p, ${defaultPixelCount})
                
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
                    neopixels[pin_num] = neopixel.NeoPixel(p, ${defaultPixelCount})
                
                np_obj = neopixels[pin_num]
                if 0 <= idx < ${defaultPixelCount}:
                    r, g, b = apply_brightness(r, g, b)
                    np_obj[idx] = (r, g, b)
                    np_obj.write()
                    print(f"OK:NEO:{pin_num}:{idx}:{r},{g},{b}")
                else:
                    print(f"ERR:NEO:IDX_OUT_OF_RANGE:{idx}")
                
        except Exception as e:
            print(f"ERR:NEO:{e}")
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

# Default animation from config
${defaultAnimation !== 'NONE' ? `
# Initialize default animation
p = machine.Pin(${defaultPin}, machine.Pin.OUT)
neopixels[${defaultPin}] = neopixel.NeoPixel(p, ${defaultPixelCount})
anim_pin = ${defaultPin}
current_anim = "${defaultAnimation}"
${defaultAnimation === 'FIRE' ? 'init_fire()' : ''}
${defaultAnimation === 'PARTICLE' ? 'init_particles(6)' : ''}
` : ''}

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
    
    if current_anim and anim_pin is not None and anim_pin in neopixels:
        np = neopixels[anim_pin]

        # ============ RAINBOW ============
        if current_anim == "RAINBOW":
            for i in range(${defaultPixelCount}):
                hue = ((i * 360 / ${defaultPixelCount}) + anim_time * 60) % 360
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
            for i in range(${defaultPixelCount}):
                r, g, b = np[i]
                np[i] = (int(r * 0.85), int(g * 0.85), int(b * 0.85))
            # Add new sparkles
            for _ in range(3):
                idx = random.randint(0, ${defaultPixelCount - 1})
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
            pos = int(anim_time * 15) % ${defaultPixelCount}
            for i in range(chase_len):
                idx = (pos + i) % ${defaultPixelCount}
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
            for i in range(${defaultPixelCount}):
                t = (i / ${defaultPixelCount - 1} + anim_time * 0.1) % 1
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
            pos = int(anim_time * 12) % (${defaultPixelCount} + 8)
            hue = (anim_time * 40) % 360
            for i in range(comet_len):
                idx = pos - i
                if 0 <= idx < ${defaultPixelCount}:
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
`;
        return code;
    }
}

export const firmwareGenerator = new FirmwareGenerator();

// Re-export modular generator
export { modularFirmwareGenerator, generateModularMicroPython, getRecoveryFirmware } from './modular-firmware-generator';
