# ESP32 MicroPython - Generated Firmware
# Modules: Home WiFi, Living Room Matrix, Home Assistant MQTT, OTA Updater, WLED Stream
# Version: 3.1.0

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

try:
    import json
    HAS_JSON = True
except:
    HAS_JSON = False

import network
import time
import socket
import uselect
import hashlib
import binascii
import struct
import neopixel
import math
import random
import time
from umqtt.simple import MQTTClient
import socket
import socket
import uselect

# ============ CONFIG ============
FIRMWARE_VERSION = "3.1.0"
DEVICE_TYPE = "ESP32_GEN"
MODULES = ["Home WiFi","Living Room Matrix","Home Assistant MQTT","OTA Updater","WLED Stream"]
CAPS = ["GPIO","WIFI","WS","MDNS","LED","MQTT","OTA","UDP"]

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
    except:
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
            f.write(f"{time.time()}:{reason}
")
    except:
        pass

# ============ GLOBALS ============
wifi_sta = network.WLAN(network.STA_IF)
wifi_ap = network.WLAN(network.AP_IF)
wifi_manual_connect = False
ws_clients = []
ws_server = None
mdns_sock = None
HOSTNAME = "led-device"

np_Living_Room_Matrix = neopixel.NeoPixel(machine.Pin(5), 64)
BRIGHTNESS_Living_Room_Matrix = 1.28
TARGET_BRIGHTNESS_Living_Room_Matrix = 1.28
curr_bright_Living_Room_Matrix = 1.28
TRANSITION_STEP_Living_Room_Matrix = 0.01
current_anim_Living_Room_Matrix = "RAINBOW"
anim_time_Living_Room_Matrix = 0.0

# Fade control
fade_active_Living_Room_Matrix = False
fade_target_Living_Room_Matrix = 0.0

def apply_brightness_Living_Room_Matrix(r, g, b):
    br = curr_bright_Living_Room_Matrix
    return (int(r * br), int(g * br), int(b * br))


# MQTT Globals
MQTT_BROKER = "192.168.1.100"
MQTT_PORT = 1883
MQTT_USER = "user"
MQTT_PASS = "pass"
MQTT_TOPIC_PREFIX = "home/livingroom"
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
        if True:
            import json
            disc_topic = f"homeassistant/light/{client_id}/config"
            payload = {
                "name": "Home Assistant MQTT",
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
        except:
            print("MQTT: Lost connection")
            setup_mqtt()


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


# UDP Sync Globals
UDP_PORT = 21324
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
            except: pass


# ============ SERIAL ============
def read_input():
    if HAS_POLL and spoll.poll(0):
        return sys.stdin.readline()
    return None

# ============ COMMAND HANDLER ============
def handle_command(cmd):
    global current_mode, boot_mode, boot_script
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
            except:
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
        except:
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
        except:
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
        global crash_count, last_crash_reason
        crash_count = 0
        last_crash_reason = ""
        # Also clear crash log
        try:
            import os
            os.remove("crash.log")
        except:
            pass
        print("OK:CRASH:RESET")
        return True
    
    if cmd == "CRASH:LOG":
        try:
            with open("crash.log", "r") as f:
                for line in f:
                    print(f"CRASH:LOG:{line.strip()}")
            print("OK:CRASH:LOG:END")
        except:
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
            print("ERR:STATE:LOAD:FAILED")
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


# Initialize WiFi
HOSTNAME = "esp32-dev-cli"
try:
if "STA" == "STA":
    ssid = "TestSSID"
password = "TestPassword123"
if ssid:
    wifi_sta.active(True)
wifi_sta.connect(ssid, password)
print(f"SYS:WIFI:CONNECTING:{ssid}")
    elif "STA" == "AP":
ssid = "TestSSID"
password = "TestPassword123"
wifi_ap.active(True)
if password:
    wifi_ap.config(essid = ssid, password = password, authmode = 3)
else:
wifi_ap.config(essid = ssid, authmode = 0)
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
for line in req.decode().split("\r\n"):
    if ": " in line:
        k, v = line.split(": ", 1)
headers[k] = v

if "Sec-WebSocket-Key" in headers:
    key = headers["Sec-WebSocket-Key"]
resp_key = binascii.b2a_base64(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode().strip()

resp = "HTTP/1.1 101 Switching Protocols\r\n"
resp += "Upgrade: websocket\r\n"
resp += "Connection: Upgrade\r\n"
resp += f"Sec-WebSocket-Accept: {resp_key}\r\n\r\n"

client.send(resp.encode())
return True
except:
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
except:
return None
    

    # Init NeoPixel Living_Room_Matrix
    np_Living_Room_Matrix.fill((0,0,0))
    np_Living_Room_Matrix.write()

setup_mqtt()
print("OTA: Ready (CMD: OTA:URL:http://...)")
setup_udp()

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


    # Manage WiFi State + Auto NTP Sync
if wifi_sta.isconnected() and not ws_server:
        # Sync NTP first(priority!)
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
except: pass


    # === NEOPIXEL Living_Room_Matrix LOOP ===
    # Smooth brightness transition
    if curr_bright_Living_Room_Matrix != TARGET_BRIGHTNESS_Living_Room_Matrix:
        diff = TARGET_BRIGHTNESS_Living_Room_Matrix - curr_bright_Living_Room_Matrix
        if abs(diff) < TRANSITION_STEP_Living_Room_Matrix:
            curr_bright_Living_Room_Matrix = TARGET_BRIGHTNESS_Living_Room_Matrix
        else:
            curr_bright_Living_Room_Matrix += TRANSITION_STEP_Living_Room_Matrix if diff > 0 else -TRANSITION_STEP_Living_Room_Matrix

    # Animations
    t_sec = time.ticks_ms() / 1000.0
    
    if current_anim_Living_Room_Matrix == "RAINBOW":
        # FastLED Rainbow
        hue_base = int(t_sec * 50) % 255
        for i in range(64):
            # hue = hue_base + (i * 255 / count)
            hue = (hue_base + (i * 256 // 64)) & 255
            rgb = color_from_palette(PALETTE_RAINBOW, hue)
            np_Living_Room_Matrix[i] = apply_brightness_Living_Room_Matrix(*rgb)
        np_Living_Room_Matrix.write()
        
    elif current_anim_Living_Room_Matrix == "FIRE":
        # FastLED Fire
        t_fire = t_sec * 0.5
        for i in range(64):
            # h1 = sin8(i * 30 + tFire * 100)
            # h2 = sin8(i * 10 - tFire * 50)
            # Using bitwise ops for speed where possible
            h1 = sin8(int(i * 30 + t_fire * 255) & 255) 
            h2 = sin8(int(i * 10 - t_fire * 125) & 255)
            heat_index = qadd8(h1, h2)
            rgb = color_from_palette(PALETTE_FIRE, heat_index)
            np_Living_Room_Matrix[i] = apply_brightness_Living_Room_Matrix(*rgb)
        np_Living_Room_Matrix.write()
        
    elif current_anim_Living_Room_Matrix == "PLASMA":
        # FastLED Plasma
        phase1 = int(t_sec * 20)
        phase2 = int(t_sec * 15)
        for i in range(64):
            index = int(i * 255 // 64)
            w1 = sin8((index + phase1) & 255)
            w2 = cos8((index + phase2) & 255)
            w3 = sin8((index + phase1 + phase2) & 255)
            color_index = (w1 + w2 + w3) // 3
            rgb = color_from_palette(PALETTE_OCEAN, color_index)
            np_Living_Room_Matrix[i] = apply_brightness_Living_Room_Matrix(*rgb)
        np_Living_Room_Matrix.write()

    elif current_anim_Living_Room_Matrix == "WEATHER_TEMP":
        # Temp gradient
        temp = SHARED_DATA.get("TEMP", 25)
        if temp < 15: t_color = (0, 100, 255)
        elif temp < 25: t_color = (0, 255, 100)
        elif temp < 30: t_color = (255, 150, 0)
        else: t_color = (255, 0, 0)
        
        height = int((temp / 40) * 64)
        for i in range(64):
            if i < height:
                ratio = i / 64 
                # Gradients require float math, keep simple for now
                r = int(ratio * t_color[0])
                g = int((1-ratio) * t_color[1] + ratio * t_color[1] * 0.5)
                b = int((1-ratio) * 255)
                np_Living_Room_Matrix[i] = apply_brightness_Living_Room_Matrix(r, g, b)
            else:
               np_Living_Room_Matrix[i] = (0,0,0)
        np_Living_Room_Matrix.write()

    elif current_anim_Living_Room_Matrix == "TIDE":
        # Tide level (0.0 to 1.0)
        level = SHARED_DATA.get("TIDE", 0.5)
        # Ocean blue palette
        height = int(level * 64)
        for i in range(64):
            if i < height:
               # Deep blue to cyan gradient
               ratio = i / height
               r = 0
               g = int(ratio * 100)
               b = int(50 + ratio * 200)
               np_Living_Room_Matrix[i] = apply_brightness_Living_Room_Matrix(r, g, b) 
            else:
               np_Living_Room_Matrix[i] = (0,0,0)
        np_Living_Room_Matrix.write()

    # MQTT Check
    if time.ticks_ms() % 100 == 0:
        mqtt_check()
    check_udp()
    
    # Measure loop time for CPU stats
    loop_time = time.ticks_diff(time.ticks_ms(), loop_start) / 1000.0
    
    # Sleep remaining time
    sleep_time = max(0, loop_delay - loop_time)
    time.sleep(sleep_time)
