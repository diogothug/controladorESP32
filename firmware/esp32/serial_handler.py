import sys
import uselect

def check_serial(handler):
    # Create a poll object
    poll = uselect.poll()
    poll.register(sys.stdin, uselect.POLLIN)
    
    # Check if there is data (timeout=0 for non-blocking)
    events = poll.poll(0)
    for obj, event in events:
        if event & uselect.POLLIN:
            # Read line from stdin
            # Note: sys.stdin.readline() might block if line is incomplete?
            # Usually in MicroPython REPL loop it grabs what's available.
            # Ideally we read char by char to avoid blocking, 
            # but sys.stdin.readline() is standard.
            try:
                line = sys.stdin.readline()
                if line:
                    line = line.strip()
                    if not line: continue
                    
                    # Parse COMMAND:PARAMS
                    if ':' in line:
                        cmd, params = line.split(':', 1)
                    else:
                        cmd = line
                        params = ""
                        
                    handler(cmd, params)
            except Exception as e:
                # print(f"ERR:SERIAL:{e}")
                pass
