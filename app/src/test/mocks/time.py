
# Mock time module (wraps standard time)
import time as _time

# Re-export everything from standard time
from time import *

def ticks_ms():
    return int(_time.time() * 1000)

def ticks_diff(a, b):
    return a - b

def sleep_ms(ms):
    _time.sleep(ms / 1000.0)

def localtime():
    return _time.localtime()
