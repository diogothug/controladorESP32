import time
from commands import handle_command
from serial_handler import check_serial

def main():
    print("ESP32 Serial Controller Started")
    
    # Optional: Disable REPL on UART0 if possible, or ensure client handles echoes.
    # import machine
    # machine.UART(0).init(115200) # Re-init might help clear state?
    
    while True:
        check_serial(handle_command)
        time.sleep(0.01) # Small sleep to yield


if __name__ == '__main__':
    main()
