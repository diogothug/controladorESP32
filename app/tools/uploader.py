import sys
import time
import serial

PORT = 'COM5'
BAUD = 115200

FILES = [
    ('boot.py', 'firmware/esp32/boot.py'),
    ('commands.py', 'firmware/esp32/commands.py'),
    ('serial_handler.py', 'firmware/esp32/serial_handler.py'),
    ('main.py', 'firmware/esp32/main.py'),
]

def read_file(path):
    with open(path, 'rb') as f:
        return f.read()

def enter_raw_repl(ser):
    print("Entering Raw REPL...")
    ser.write(b'\r\x03') # Ctrl-C
    time.sleep(0.1)
    ser.write(b'\r\x03') # Ctrl-C again
    time.sleep(0.1)
    
    ser.write(b'\r\x01') # Ctrl-A
    time.sleep(0.1)
    
    resp = ser.read_all()
    if b'raw REPL; CTRL-B to exit' in resp:
        print("Success: In Raw REPL")
        return True
    
    # Try again
    ser.write(b'\r\x01')
    time.sleep(0.5)
    resp = ser.read_all()
    if b'raw REPL' in resp:
        print("Success: In Raw REPL (Attempt 2)")
        return True
        
    print(f"Failed to enter Raw REPL. Response: {resp}")
    return False

def exec_raw(ser, code):
    ser.write(code)
    ser.write(b'\x04') # Ctrl-D to execute
    
    # Wait for OK
    data = b''
    while not data.endswith(b'\x04>'):
        if ser.in_waiting:
            chunk = ser.read(ser.in_waiting)
            data += chunk
        time.sleep(0.01)
        
    # Check for error
    decoded = data.decode('utf-8', errors='ignore')
    if 'Traceback' in decoded:
        print(f"Error executing code: {decoded}")
        return False
    return True

def upload_file(ser, filename, pc_path):
    print(f"Uploading {filename}...")
    content = read_file(pc_path)
    
    # Python code to write file
    # We escape the content
    code = f"""
with open('{filename}', 'wb') as f:
    f.write({content})
print('Saved {filename}')
"""
    # Send as raw execution
    # But raw REPL expects: <code bytes> <Ctrl-D>
    # We need to send bytes.
    return exec_raw(ser, code.encode('utf-8'))

def main():
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1)
        print(f"Opened {PORT}")
        
        # Hard reset via DTR/RTS
        print("Resetting board via DTR/RTS...")
        ser.dtr = False
        ser.rts = True
        time.sleep(0.1)
        ser.rts = False
        time.sleep(1.0) # Wait for boot
        
    except Exception as e:
        print(f"Failed to open port: {e}")
        return

    try:
        if not enter_raw_repl(ser):
            return

        for fname, fpath in FILES:
            if not upload_file(ser, fname, fpath):
                print(f"Failed to upload {fname}")
                break
            time.sleep(0.5)
            
        print("Resetting board...")
        ser.write(b'\r\x04') # Ctrl-D (soft reset in raw repl)
        time.sleep(1)
        print("Done.")
        
    finally:
        ser.close()

if __name__ == '__main__':
    main()
