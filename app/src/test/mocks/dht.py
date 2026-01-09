
# Mock dht module

class DHTBase:
    def __init__(self, pin):
        self.pin = pin
        self.temp = 25.0
        self.hum = 50.0

    def measure(self):
        # Simulate sensor reading
        pass

    def temperature(self):
        return self.temp

    def humidity(self):
        return self.hum

class DHT11(DHTBase):
    pass

class DHT22(DHTBase):
    pass
