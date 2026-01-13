# C++ Core Transition Complete

The "Premium" C/C++ firmware core has been successfully set up and implemented.

## Key Accomplishments
1.  **Robust Foundation**: `firmware/esp32_core` initialized with PlatformIO.
2.  **Safety First**: Hardware Watchdog & Crash Counter implemented (Safe Mode).
3.  **Core Features**:
    -   **LEDs**: FastLED integration with smooth animation support.
    -   **WiFi**: Auto-reconnecting logic with NTP time sync.
    -   **Tide**: Deterministic M2 constituent calculation.
4.  **Integration**: `SerialHandler` bridges the new core with your Desktop App.

## Resilience & Hardening (Phase 4)
-   **WiFi Fallback**: Automatically creates AP `TideDisplay_Recovery` if connection fails 3x.
-   **Offline Tide**: Saves time to NVS. If power returns without internet, Tide still works.
-   **LED Protection**: 
    -   Voltage/Current limited to 5V/1000mA.
    -   Brightness capped at 80% (200/255) for longevity.
    -   Soft-start on boot to prevent inrush current.

## How to Build & Flash

### Option A: VS Code Extension (Recommended)
1.  Install the **PlatformIO IDE** extension in VS Code.
2.  Click the "Alien" icon in the left sidebar.
3.  Under `Project Tasks` > `env:esp32dev`, choose:
    -   **Build**: To compile.
    -   **Upload**: To flash the device.
    -   **Monitor**: To see serial output (logs).

### Option B: Terminal (CLI)
Navigate to `firmware/esp32_core` and run:
```bash
pio run -t upload
pio device monitor
```

## Next Steps
-   **Desktop App**: Update the app to recognize and upload this C++ binary instead of the generated MicroPython one (Future task).
-   **Fine Tuning**: Adjust LED colors and Tide constants for the specific location (Moreré).
