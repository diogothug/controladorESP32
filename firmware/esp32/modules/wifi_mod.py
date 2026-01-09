# WiFi Module - Connectivity for ESP32
# Injected when user adds WiFi module

# === METADATA ===
MODULE_ID = "wifi"
MODULE_NAME = "WiFi Manager"
MODULE_CAPS = ["WIFI", "MDNS", "WS"]

# === IMPORTS ===
"""
import network
import time
import socket
import uselect
import hashlib
import binascii
import struct
import machine
"""

# === GLOBALS ===
"""
wifi_sta = network.WLAN(network.STA_IF)
wifi_ap = network.WLAN(network.AP_IF)
wifi_manual_connect = False
ws_clients = []
ws_server = None
mdns_sock = None
HOSTNAME = "led-device"
"""

# === COMMANDS ===
"""
if cmd.startswith("WIFI:CONNECT:"):
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
            
        print(f"OK:WIFI:AP:CREATED:{ssid}")
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
        # Ensure servers are running if connected
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
"""

# === INIT ===
"""
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
    except:
        pass
    return False

def ws_read_frame(client):
    try:
        # Minimal frame parser
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
"""

# === LOOP ===
"""
# Manage WiFi State
if wifi_sta.isconnected() and not ws_server:
    setup_servers(wifi_sta.ifconfig()[0])

# WebSocket Accept
if ws_server:
    try:
        cl, addr = ws_server.accept()
        cl.setblocking(False) # Temporarily blocking for handshake? No, non-blocking.
        # Actually for handshake it's easier to be blocking for a ms
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
            # Execute command
            handle_command(msg)
            # Optional: Echo back OK?
    except Exception:
        # Check if closed
        try:
             # If read fails significantly, remove
             pass
        except:
             ws_clients.remove(cl)

# mDNS Responder (Minimal Loop)
if mdns_sock:
    try:
        data, addr = mdns_sock.recvfrom(1024)
        if hasattr(data, 'find') and data.find(b'\\x05_http\\x04_tcp\\x05local') != -1:
             # Respond to mDNS queries (TO DO: Full packet construction is heavy)
             # usually libraries handle this. For now this keeps socket drained.
             pass
    except OSError:
        pass
"""
