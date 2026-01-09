
# Mock machine module for testing
import sys

class Pin:
    IN = 0
    OUT = 1
    PULL_UP = 2
    PULL_DOWN = 3
    IRQ_RISING = 1
    IRQ_FALLING = 2

    # Registry of created pins for inspection
    pins = {}

    def __init__(self, id, mode=-1, pull=-1):
        self.id = id
        self.mode = mode
        self.pull = pull
        self.value_state = 0
        self._handler = None
        Pin.pins[id] = self

    def value(self, v=None):
        if v is not None:
            self.value_state = int(v)
        return self.value_state

    def on(self):
        self.value_state = 1
        
    def off(self):
        self.value_state = 0
        
    def irq(self, handler=None, trigger=0):
        self._handler = handler
        self._trigger = trigger

class PWM:
    def __init__(self, pin, freq=5000, duty=0):
        self.pin = pin
        self.freq_val = freq
        self.duty_val = duty

    def freq(self, f=None):
        if f is not None: self.freq_val = f
        return self.freq_val

    def duty(self, d=None):
        if d is not None: self.duty_val = d
        return self.duty_val

    def duty_u16(self, d=None):
        if d is not None: self.duty_val = d >> 6 # Approx mapping
        return self.duty_val

class ADC:
    ATTN_11DB = 3
    WIDTH_12BIT = 3
    
    def __init__(self, pin):
        self.pin = pin
        self.val = 0
    
    def read(self):
        return self.val
        
    def read_u16(self):
        return self.val * 16 # Approx scaling
        
    def atten(self, a): pass
    def width(self, w): pass
    
    # helper for tests
    def set_simulation_value(self, v):
        self.val = v

class I2C:
    def __init__(self, id=0, scl=None, sda=None, freq=400000):
        self.id = id
        self.scl = scl
        self.sda = sda

    def scan(self):
        return []

    def writeto(self, addr, buf):
        pass

def reset():
    print("MOCK: machine.reset() called")

def unique_id():
    return b'MOCK_ID_1234'
