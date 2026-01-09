
# Mock espnow module
class ESPNow:
    def __init__(self):
        self._active = False
        self._pmk = None

    def active(self, val=None):
        if val is not None:
            self._active = val
        return self._active

    def set_pmk(self, pmk):
        self._pmk = pmk

    def add_peer(self, peer_mac, lmk=None, channel=0, ifidx=0, encrypt=False):
        pass

    def send(self, peer_mac, msg):
        print(f"MOCK: ESPNOW Sent to {peer_mac}: {msg}")
        return True

    def recv(self, timeout_ms=0):
        # Return (mac, msg) or None
        return None
