
# Mock utime module for MicroPython compatibility
# Re-export all from standard time plus MicroPython-specific functions
import time as _time

# Standard time functions
sleep = _time.sleep
time = _time.time
localtime = _time.localtime

# MicroPython-specific functions
def ticks_ms():
    """Return milliseconds counter (wrapping)"""
    return int(_time.time() * 1000) % (2**30)

def ticks_us():
    """Return microseconds counter (wrapping)"""
    return int(_time.time() * 1000000) % (2**30)

def ticks_diff(end, start):
    """Compute difference between ticks values (handles wrapping)"""
    return (end - start) % (2**30)

def ticks_add(ticks, delta):
    """Add a delta to a ticks value"""
    return (ticks + delta) % (2**30)

def sleep_ms(ms):
    """Sleep for given milliseconds"""
    _time.sleep(ms / 1000.0)

def sleep_us(us):
    """Sleep for given microseconds"""
    _time.sleep(us / 1000000.0)
