# This file is executed on every boot (including wake-boot from deepsleep)
#import esp
#esp.osdebug(None)

# Optional: Disable REPL on UART0 to prevent interference
# import uos
# uos.dupterm(None, 1)

print("Boot complete")
