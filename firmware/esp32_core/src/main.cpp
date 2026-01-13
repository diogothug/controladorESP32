#include <Arduino.h>
#include <LittleFS.h>
#include "config.h"
#include "sys/watchdog.h"
#include "sys/boot.h"
#include "sys/state.h"
#include "sys/clock.h"
#include "sys/serial_handler.h"
#include "modules/led_manager.h"
#include "modules/wifi_manager.h"
#include "modules/tide_engine.h"
#include "modules/web_server.h"

// Stability tracking
static unsigned long bootTime = 0;
static bool stabilized = false;
static const unsigned long STABILITY_THRESHOLD_MS = 30000; // 30 seconds to be considered "Stable"

void setup() {
    // 1. Hardware Init
    Serial.begin(SERIAL_BAUD);
    while (!Serial) { delay(10); } // Wait for serial
    Serial.println("\n\n=== TideDisplay Pro CORE BOOT ===");
    Serial.printf("FW: %s | Device: %s\n", FIRMWARE_VERSION, PRODUCT_NAME);

    // 2. Init Watchdog immediately (Hardware Safety)
    Sys::initWatchdog(WATCHDOG_TIMEOUT_SEC);
    
    // 3. Init Clock (NTP/RTC)
    Sys::initClock();

    // 4. Boot Checks (Safe Mode logic)
    bool isNormalBoot = Sys::checkBoot();

    if (!isNormalBoot) {
        Serial.println("[MAIN] Boot: SAFE MODE ACTIVE");
        // In Safe Mode, we don't init complex hardware (WiFi, LED Matrix)
        // Just a simple blink or specific limited functionality
        pinMode(LED_PIN, OUTPUT);
    } else {
        Serial.println("[MAIN] Boot: NORMAL MODE");
        
        // Init Filesystem
        if (!LittleFS.begin(true)) {
            Serial.println("[MAIN] LittleFS Mount Failed");
            return;
        }

        // Init Modules
        Modules::LedManager::init();
        Modules::WifiManager::init(); // Connects or Falls back to AP
        Modules::TideEngine::init();
        Modules::WebServerModule::init(); // Starts Web/DNS Server
        
        // Start a boot animation
        Modules::LedManager::setAnimation(Modules::LedManager::RAINBOW);
    }
    
    // ... setup ...

}

void loop() {
    // 1. Feed Watchdog (CRITICAL)
    Sys::feedWatchdog();

    // 2. Stability Check
     // ... stability check logic ...

    // 3. Serial Input (Process Commands)
    Sys::SerialHandler::update();

    // 4. Safe Mode Indicator (Fast Blink)
    if (Sys::getState().bootMode != Sys::BootMode::NORMAL) {
        // ... safe mode blink ...
    } else {
        // 4. Normal Loop
        Modules::LedManager::update();
        Modules::WifiManager::update();
        Modules::TideEngine::update();
        Modules::WebServerModule::update(); // Handle HTTP/DNS requests
        
        // Use vTaskDelay to yield to IDLE task and allow WiFi/BT handling
        vTaskDelay(10 / portTICK_PERIOD_MS); 
    }
}
