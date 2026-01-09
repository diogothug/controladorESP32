
import sys
import os
import time as standard_time

# Add mocks to path
current_dir = os.path.dirname(os.path.abspath(__file__))
mocks_dir = os.path.join(current_dir, '../mocks')
sys.path.insert(0, mocks_dir)

# Patch the standard time module with MicroPython-specific functions
def ticks_ms():
    return int(standard_time.time() * 1000) % (2**30)

def ticks_us():
    return int(standard_time.time() * 1000000) % (2**30)

def ticks_diff(end, start):
    return (end - start) % (2**30)

def ticks_add(ticks, delta):
    return (ticks + delta) % (2**30)

def sleep_ms(ms):
    standard_time.sleep(ms / 1000.0)

def sleep_us(us):
    standard_time.sleep(us / 1000000.0)

# Inject into the time module (already loaded as standard_time)
standard_time.ticks_ms = ticks_ms
standard_time.ticks_us = ticks_us
standard_time.ticks_diff = ticks_diff
standard_time.ticks_add = ticks_add
standard_time.sleep_ms = sleep_ms
standard_time.sleep_us = sleep_us

# Also make utime an alias
sys.modules['utime'] = standard_time

# Import hardware mocks
import machine
import network

def verify_firmware(firmware_path):
    print(f"TEST: Loading {firmware_path}")
    
    with open(firmware_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # Disable infinite loop -> Run ONCE for verification
    code = code.replace("while True:", "for _mock_loop_i in range(1): # Loop run once")
    
    globs = {'__name__': '__main__'}
    
    try:
        # Execute the firmware code with mocks
        exec(code, globs)
        print("TEST: Execution successful")
        
        # Verify side effects on Mock modules
        import machine
        print(f"TEST: Created Pins: {len(machine.Pin.pins)}")
        
        print("TEST: PASS")

    except Exception as e:
        print(f"FAIL: Runtime Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: run_unit_mock.py <firmware_file>")
        sys.exit(1)
    
    verify_firmware(sys.argv[1])
