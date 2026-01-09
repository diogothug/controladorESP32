
# Mock network module
STA_IF = 0
AP_IF = 1

class WLAN:
    def __init__(self, interface_id):
        self.interface_id = interface_id
        self.is_active = False
        self.connected = False
        self.config_data = {}

    def active(self, val=None):
        if val is not None:
            self.is_active = val
        return self.is_active

    def connect(self, ssid, password):
        print(f"MOCK: Connecting to {ssid}...")
        self.connected = True

    def isconnected(self):
        return self.connected

    def ifconfig(self, config=None):
        if config:
            self.config_data = config
        return ('192.168.1.100', '255.255.255.0', '192.168.1.1', '8.8.8.8')

    def scan(self):
        # Return list of (ssid, bssid, channel, RSSI, authmode, hidden)
        return [
            (b'MockWiFi', b'00:11:22:33:44:55', 1, -50, 3, 0),
            (b'NeighborWiFi', b'AA:BB:CC:DD:EE:FF', 6, -80, 3, 0)
        ]

    def config(self, param):
        if param == 'mac':
            return b'\xde\xad\xbe\xef\xfe\xed'
        return None
