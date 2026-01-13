# Transition to C/C++ Core

The goal is to migrate the definitive product firmware from MicroPython to C/C++ (ESP-IDF/Arduino) to ensure deterministic behavior, robust offline operation, and long-term maintainability, while strictly using CircuitPython only for creative prototyping.

- [x] **Phase 1: Foundation & scaffolding**
    - [x] Create `implementation_plan.md` <!-- id: 0 -->
    - [x] Initialize PlatformIO project for ESP32 in `firmware/esp32_core` <!-- id: 1 -->
    - [x] Structure the C++ project (Modular architecture: /src, /include, /lib) <!-- id: 2 -->
    - [x] Implement robust "Premium" features base
        - [x] Watchdog (Task Watchdog Timer) <!-- id: 3 -->
        - [x] Boot sequence & Safe Mode (Crash counting) <!-- id: 4 -->
        - [x] RTC/Timekeeping (NTP + Internal millis fallback) <!-- id: 5 -->

- [x] **Phase 2: Core Features Implementation**
    - [x] Port LED/NeoPixel control logic (FastLED or Adafruit_NeoPixel) <!-- id: 6 -->
    - [x] Port WiFi & Connection Manager (with fallback behaviors) <!-- id: 7 -->
    - [x] Port Tide/Time logic (Deterministic calculation) <!-- id: 8 -->

- [x] **Phase 3: Integration (Optional/Later)**
    - [x] Update Serial Protocol for C++ firmware <!-- id: 9 -->
    - [x] (Future) Verify compilation with PlatformIO CLI <!-- id: 10 -->

- [x] **Phase 4: Resilience & Hardening**
    - [x] WiFi: AP Fallback & Exponential Backoff <!-- id: 11 -->
    - [x] Tide: Offline Time Persistence (Last Known Good Time) <!-- id: 12 -->
    - [x] Power: FastLED Voltage/Current Limiting <!-- id: 13 -->
    - [x] LED: Longevity Protection (Soft Start + Max Brightness Cap) <!-- id: 14 -->

- [ ] **Phase 5: Quality Assurance**
    - [x] App: Add Edge Case Tests (Automation, Invalid Inputs) <!-- id: 15 -->

- [ ] **Phase 6: Enhanced Offline Tide**
    - [x] Config: Default Location 'Moreré' & 28-Day Limit <!-- id: 16 -->
    - [x] Engine: Implement Tide Cache (Struct + NVS) <!-- id: 17 -->
    - [x] Engine: Logic for 28-day data verification <!-- id: 18 -->

- [ ] **Phase 7: Web Interface & API (Missing Core Feature)**
    - [x] Web: Provisioning (Captive Portal) <!-- id: 19 -->
    - [x] Web: API Endpoints (/status, /api/tide, /api/auth) <!-- id: 20 -->
    - [x] Web: User Dashboard (Embedded HTML) <!-- id: 21 -->

- [ ] **Phase 8: Manufacturer Customization**
    - [x] App: C++ Config Generator (config.h) <!-- id: 22 -->
    - [x] App: Build & Flash Pipeline (PlatformIO CLI) <!-- id: 23 -->
