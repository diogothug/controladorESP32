
## Phase 4: resilience & Hardening (New)

### [MODIFY] `firmware/esp32_core/src/modules/wifi_manager.cpp`
- **AP Fallback**: If STA connection fails after 3 attempts, start an Access Point `TideDisplay_Recovery`.
- **Exponential Backoff**: Increase reconnect interval (30s -> 60s -> 5m) to save power/cpu.

### [MODIFY] `firmware/esp32_core/src/sys/clock.cpp`
- **Time Persistence**:
    - Save current epoch to NVS every hour.
    - On boot, if NTP fails, load last epoch + estimate elapsed time.
    - Allows tide to work (approximate) even after power loss + no internet.

### [MODIFY] `firmware/esp32_core/src/modules/led_manager.cpp`
- **Power Limiting**: add `FastLED.setMaxPowerInVoltsAndMilliamps(5, 1000);` to prevent brownouts.
- **Status Overlay**: If system is degraded (No WiFi/Time), blink the first pixel Red/Amber.

### [MODIFY] `firmware/esp32_core/src/main.cpp`
- **Brownout Detector**: Ensure it's enabled (ESP32 default, but verify).

## Phase 6: Enhanced Offline Tide (User Request)

### [MODIFY] `firmware/esp32_core/include/config.h`
- Define `TIDE_CACHE_DAYS` as 28.
- Define `DEFAULT_TIDE_PORT_CHAIN` as prioritized list: {Cairu, Valença, Camamu, Aratu, Salvador}.

### [MODIFY] `firmware/esp32_core/include/modules/tide_engine.h`
- Add `TideExtrema` struct (Timestamp, Level, Type).
- Add `saveCache()` and `loadCache()` methods using NVS Blobs.
- Add `cache` buffer to hold ~112 entries (28 days * 4 tides/day).

### [MODIFY] `firmware/esp32_core/src/modules/tide_engine.cpp`
- **Smart Default Logic**:
    1. Try **Cairu** (Offset: +5 min).
    2. Fallback **Valença** (Offset: -10 min).
    3. Fallback **Camamu** (Offset: 0 min, variable).
    4. Fallback **Aratu** (Offset: 0 min, variable).
    5. Fallback **Salvador** (Low Confidence).
- **Offline Storage**: Serialize/Deserialize `TideExtrema` vector to NVS.
- **Data Verifier**: On boot/daily, check if we have < 28 days of future data. If yes, mark flag to fetch more.

## Phase 7: Web Interface & API (Parity)

### [NEW] `firmware/esp32_core/include/modules/web_server.h`
- Define `WebServerModule` class.
- Methods: `init()`, `handleClient()`.

### [NEW] `firmware/esp32_core/src/modules/web_server.cpp`
- Implement `WebServer` (Standard Arduino `WebServer` or `ESPAsyncWebServer`).
- **Endpoints**:
    - `/` (GET): Dashboard (if authenticated) or Login.
    - `/api/status` (GET): JSON system status.
    - `/api/tide` (GET): Current level + Next High/Low.
    - `/api/config` (POST): Update WiFi/Tide settings.
- **Captive Portal**: Handle DNS hijacking for provisioning.

### [MODIFY] `firmware/esp32_core/src/main.cpp`
- Initialize `Modules::WebServer`.
- Call `Modules::WebServer::update()` in loop.

## Phase 8: Manufacturer Customization (App Integration)

### [NEW] `app/src/main/generators/cpp-config-generator.ts`
- **Purpose**: Generates `firmware/esp32_core/include/config.h` based on User Inputs.
- **Parameters**:
    - `DEFAULT_TIDE_PORT` (Enum: Cairu, Valença, Camamu, etc.)
    - `LED_CONFIG`: `NUM_LEDS`, `LED_PIN`, `LED_TYPE` (Matrix/Strip).
    - `HARDWARE_FLAGS`: `HAS_LDR` (bool).
    - `SECURITY`: `BT_PIN` (for Bluetooth pairing), `WEB_PASS` (for Web Dashboard).


### [MODIFY] `app/src/main/firmware-builder.ts`
- **Build Pipeline**:
    1. Receive Manufacturer Config JSON.
    2. Call `CppConfigGenerator` -> Overwrite `config.h`.
    3. Execute `platformio run -d firmware/esp32_core`.
    4. Execute `platformio run -d firmware/esp32_core --target upload`.



