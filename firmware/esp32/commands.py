from machine import Pin, ADC, PWM
import neopixel
import gc
import time

# Store configured pins to avoid re-initialization
_pins = {}
_adcs = {}
_pwms = {}
_neopixels = {}

def handle_command(cmd, params):
    try:
        if cmd == "SYS":
            return _handle_sys(params)
        if cmd == "PIN":
            return _handle_pin(params)
        if cmd == "READ":
            return _handle_read(params)
        if cmd == "ADC":
            return _handle_adc(params)
        if cmd == "PWM":
            return _handle_pwm(params)
        if cmd == "WIFI":
            return _handle_wifi(params)
        if cmd == "STATUS":
            return _handle_status()
        if cmd == "NEO":
            return _handle_neo(params)
        if cmd == "BRIGHT":
            return _handle_brightness(params)
            
        print(f"ERR:UNKNOWN_CMD:{cmd}")
        
    except Exception as e:
        print(f"ERR:EXCEPTION:{e}")

# Global brightness (0.0 - 1.0)
_brightness = 0.15

def _apply_brightness(r, g, b):
    """Apply brightness scaling"""
    return (
        int(r * _brightness),
        int(g * _brightness),
        int(b * _brightness)
    )

def _handle_brightness(params):
    global _brightness
    try:
        val = int(params.strip())
        _brightness = max(0, min(100, val)) / 100.0
        print(f"OK:BRIGHT:{val}")
    except:
        print("ERR:BRIGHT:INVALID")

def _handle_neo(params):
    """Handle NEO commands: NEO:PIN:CLEAR, NEO:PIN:IDX:R,G,B"""
    global _neopixels
    try:
        parts = params.split(":")
        if len(parts) < 1:
            print("ERR:NEO:INVALID_FORMAT")
            return
            
        pin_num = int(parts[0])
        
        # Create NeoPixel if not exists
        if pin_num not in _neopixels:
            p = Pin(pin_num, Pin.OUT)
            _neopixels[pin_num] = neopixel.NeoPixel(p, 64)  # Default 64 LEDs
        
        np = _neopixels[pin_num]
        
        if len(parts) >= 2:
            sub_cmd = parts[1].upper()
            
            # NEO:PIN:CLEAR
            if sub_cmd == "CLEAR":
                np.fill((0, 0, 0))
                np.write()
                print(f"OK:NEO:{pin_num}:CLEAR")
                return
            
            # NEO:PIN:FILL:R,G,B
            if sub_cmd == "FILL" and len(parts) >= 3:
                r, g, b = map(int, parts[2].split(","))
                r, g, b = _apply_brightness(r, g, b)
                np.fill((r, g, b))
                np.write()
                print(f"OK:NEO:{pin_num}:FILL:{r},{g},{b}")
                return
            
            # NEO:PIN:IDX:R,G,B (set single pixel)
            try:
                # NEO:PIN:BMP:W:H:DATA (Bitmap hex string)
                if sub_cmd == "BMP" and len(parts) >= 5:
                    width = int(parts[2])
                    height = int(parts[3])
                    data_hex = parts[4]
                    
                    if len(data_hex) != width * height * 6:
                        print(f"ERR:NEO:BMP_SIZE_MISMATCH:EXPECTED_{width*height*6}_GOT_{len(data_hex)}")
                        return

                    # Decode hex string to bytes
                    import binascii
                    try:
                        raw_data = binascii.unhexlify(data_hex)
                    except:
                        print("ERR:NEO:BMP_INVALID_HEX")
                        return

                    # Render
                    if len(np) < width * height:
                        print(f"WARN:NEO:BMP_TOO_LARGE_FOR_MATRIX:{len(np)}_VS_{width*height}")

                    for y in range(height):
                        for x in range(width):
                            if y * width + x >= len(np): break
                            
                            idx = (y * width + x) * 3
                            r = raw_data[idx]
                            g = raw_data[idx+1]
                            b = raw_data[idx+2]
                            
                            # Simple row-major mapping: i = y * width + x
                            pixel_idx = y * width + x
                            
                            r, g, b = _apply_brightness(r, g, b)
                            np[pixel_idx] = (r, g, b)
                            
                    np.write()
                    print(f"OK:NEO:{pin_num}:BMP:{width}x{height}")
                    return

                idx = int(sub_cmd)
                if len(parts) >= 3:
                    r, g, b = map(int, parts[2].split(","))
                    r, g, b = _apply_brightness(r, g, b)
                    if 0 <= idx < len(np):
                        np[idx] = (r, g, b)
                        np.write()
                        print(f"OK:NEO:{pin_num}:{idx}:{r},{g},{b}")
                    else:
                        print(f"ERR:NEO:IDX_OUT_OF_RANGE:{idx}")
                    return
            except ValueError:
                pass
        
        print(f"ERR:NEO:INVALID_CMD:{params}")
        
    except Exception as e:
        print(f"ERR:NEO:{e}")


def _handle_sys(params):
    if params == "HELLO":
        print("OK:DEVICE=ESP32;FW=1.1.0;CAPS=WIFI,SERIAL,GPIO,ADC,PWM,NEO")
    elif params == "RESET":
        import machine
        machine.reset()
    else:
        print(f"ERR:SYS_PARAM:{params}")


def _handle_pin(params):
    """Handle PIN:gpio,HIGH/LOW"""
    try:
        parts = params.split(',')
        if len(parts) != 2:
            print("ERR:PIN_FORMAT")
            return
            
        gpio = int(parts[0])
        value = parts[1].strip().upper()
        
        # Get or create pin
        if gpio not in _pins:
            _pins[gpio] = Pin(gpio, Pin.OUT)
        
        if value == "HIGH" or value == "1":
            _pins[gpio].value(1)
        elif value == "LOW" or value == "0":
            _pins[gpio].value(0)
        else:
            print(f"ERR:PIN_VALUE:{value}")
            return
            
        print(f"OK:PIN:{gpio}={value}")
        
    except ValueError:
        print("ERR:PIN_INVALID_GPIO")


def _handle_read(params):
    """Handle READ:gpio - digital read"""
    try:
        gpio = int(params.strip())
        
        # Configure as input if not already
        if gpio not in _pins or _pins[gpio].mode() != Pin.IN:
            _pins[gpio] = Pin(gpio, Pin.IN, Pin.PULL_UP)
        
        val = _pins[gpio].value()
        print(f"OK:READ:{gpio}={val}")
        
    except ValueError:
        print(f"ERR:READ_INVALID:{params}")


def _handle_adc(params):
    """Handle ADC:channel or ADC:gpio - ESP32 has ADC on specific pins"""
    try:
        # ESP32 ADC1 channels: GPIO 32-39 (channels 0-7)
        # ESP32 ADC2 channels: GPIO 0,2,4,12-15,25-27 (but conflicts with WiFi)
        gpio = int(params.strip())
        
        # Valid ADC pins on ESP32
        valid_adc_pins = [32, 33, 34, 35, 36, 39, 25, 26, 27, 14, 12, 13, 15, 2, 4]
        
        if gpio not in valid_adc_pins:
            print(f"ERR:ADC_INVALID_PIN:{gpio}")
            return
        
        if gpio not in _adcs:
            _adcs[gpio] = ADC(Pin(gpio))
            _adcs[gpio].atten(ADC.ATTN_11DB)  # Full range: 0-3.3V
            _adcs[gpio].width(ADC.WIDTH_12BIT)  # 0-4095
        
        val = _adcs[gpio].read()
        print(f"OK:ADC:{gpio}={val}")
        
    except ValueError:
        print(f"ERR:ADC_INVALID:{params}")


def _handle_pwm(params):
    """Handle PWM:gpio,duty or PWM:gpio,freq,duty"""
    try:
        parts = params.split(',')
        
        if len(parts) < 2:
            print("ERR:PWM_FORMAT")
            return
        
        gpio = int(parts[0])
        
        if len(parts) == 2:
            # PWM:gpio,duty (0-1023)
            duty = int(parts[1])
            freq = 1000  # Default 1kHz
        else:
            # PWM:gpio,freq,duty
            freq = int(parts[1])
            duty = int(parts[2])
        
        if gpio not in _pwms:
            _pwms[gpio] = PWM(Pin(gpio))
        
        _pwms[gpio].freq(freq)
        _pwms[gpio].duty(duty)
        
        print(f"OK:PWM:{gpio}={duty}@{freq}Hz")
        
    except ValueError:
        print(f"ERR:PWM_INVALID:{params}")


def _handle_wifi(params):
    """Handle WIFI commands"""
    try:
        import network
        wlan = network.WLAN(network.STA_IF)
        
        if params == "STATUS":
            if wlan.isconnected():
                ip = wlan.ifconfig()[0]
                print(f"OK:WIFI:CONNECTED:{ip}")
            else:
                print("OK:WIFI:DISCONNECTED")
        elif params.startswith("SCAN"):
            wlan.active(True)
            networks = wlan.scan()
            ssids = [n[0].decode() for n in networks[:10]]  # Max 10
            print(f"OK:WIFI:SCAN:{','.join(ssids)}")
        else:
            print(f"ERR:WIFI_PARAM:{params}")
    except Exception as e:
        print(f"ERR:WIFI:{e}")


def _handle_status():
    """Return system status"""
    gc.collect()
    free_mem = gc.mem_free()
    alloc_mem = gc.mem_alloc()
    print(f"OK:STATUS:MEM_FREE={free_mem};MEM_ALLOC={alloc_mem}")

