import math
import time

def scale8(i, scale):
    return (i * scale) // 256

def beatsin8(bpm, lowest=0, highest=255, time_ms=0, phase_offset=0):
    if bpm == 0:
        return (lowest + highest) // 2
    
    # FastLED uses 16-bit timebase where 65535 = 1 cycle? 
    # Or just standard sine.
    # beat = sin( (time * bpm * ...) )
    
    # 1 Minute = 60000ms.
    # period = 60000 / bpm
    period_ms = 60000 / bpm
    
    # Normalized time 0..1
    t = (time_ms % period_ms) / period_ms
    
    # Sine -1..1 -> 0..1
    s = (math.sin(t * 2 * 3.14159) + 1.0) / 2.0
    
    # Map to range
    val = lowest + int(s * (highest - lowest))
    return val

def test_breathe_smoothness():
    print("[TEST-PY] Breathe Smoothness Analysis...")
    
    # Params
    led_count = 64
    bpm = 12
    fps = 60
    duration_sec = 5
    
    frames = int(duration_sec * fps)
    ms_per_frame = 1000 // fps
    
    brightness_history = []
    
    current_time = 0
    
    for i in range(frames):
        b = beatsin8(bpm, 10, 255, current_time)
        
        # In C++: fill_solid(CRGB(0, scale8(b, 128), b))
        # We track 'b' (Blue channel) which is the primary driver
        
        brightness_history.append(b)
        current_time += ms_per_frame
        
    # Stats
    max_jump = 0
    min_val = 255
    max_val = 0
    
    for i in range(1, len(brightness_history)):
        diff = abs(brightness_history[i] - brightness_history[i-1])
        if diff > max_jump:
            max_jump = diff
            
    for val in brightness_history:
        if val < min_val: min_val = val
        if val > max_val: max_val = val
        
    print(f"  > Frames: {frames}")
    print(f"  > Min Val: {min_val}")
    print(f"  > Max Val: {max_val}")
    print(f"  > Max Jump (Step): {max_jump}")
    
    if max_jump <= 3:
        print("[PASS] Animation is fluid.")
    else:
        print(f"[FAIL] Jerky! Max jump: {max_jump}")
        
    if (max_val - min_val) > 200:
        print("[PASS] Dynamic Range OK.")
    else:
        print("[FAIL] Range too small.")

if __name__ == "__main__":
    test_breathe_smoothness()
