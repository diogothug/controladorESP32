
import sys
import os

# Add mocks to path
current_dir = os.path.dirname(os.path.abspath(__file__))
mocks_dir = os.path.join(current_dir, '../mocks')
sys.path.insert(0, mocks_dir)

# Force load our mock time (std python time is built-in)
if 'time' in sys.modules:
    del sys.modules['time']
import time
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
