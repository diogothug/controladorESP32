
# Mock neopixel module

class NeoPixel:
    def __init__(self, pin, n, bpp=3, timing=1):
        self.pin = pin
        self.n = n
        self.bpp = bpp
        self.buf = [(0,0,0)] * n

    def __setitem__(self, index, val):
        if 0 <= index < self.n:
            self.buf[index] = val

    def __getitem__(self, index):
        if 0 <= index < self.n:
            return self.buf[index]
        return (0,0,0)

    def fill(self, color):
        for i in range(self.n):
            self.buf[i] = color

    def write(self):
        # In a real mock runner, we could dump this to stdout or a file for verification
        pass
