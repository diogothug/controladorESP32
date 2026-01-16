#include "config.h"
#include "modules/led_manager.h"
#include "modules/recovery.h"
#include "modules/tide_engine.h"
#include "modules/touch_manager.h"
#include "modules/web_server.h"
#include "modules/wifi_manager.h"
#include "sys/clock.h"
#include "sys/serial_handler.h"
#include <Arduino.h>
#include <LittleFS.h>

// Stability tracking
static unsigned long bootTime = 0;
static bool stabilized = false;
static const unsigned long STABILITY_THRESHOLD_MS =
    30000; // 30 seconds to be considered "Stable"

void setup() {
  // 1. Hardware Init
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  } // Wait for serial
  Serial.println("\n\n=== TideDisplay Pro CORE BOOT ===");
  Serial.printf("FW: %s | Device: %s\n", FIRMWARE_VERSION, PRODUCT_NAME);

  // 2. Init Recovery Manager (SAFE MODE & WATCHDOGS)
  Modules::RecoveryManager::init();

  // 3. Init Clock (NTP/RTC)
  Sys::initClock();

  // 4. Safe Mode Check
  if (Modules::RecoveryManager::isSafeMode()) {
    Serial.println("[MAIN] Boot: SAFE MODE ACTIVE");
    // In Safe Mode, we don't init complex hardware (WiFi, LED Matrix)
    // Just a simple blink or specific limited functionality
    pinMode(2, OUTPUT); // Builtin LED
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
    Modules::TouchManager::init();

    // Start a boot animation
    Modules::LedManager::setAnimation(Modules::LedManager::RAINBOW);
  }

  // ... setup ...
}

void loop() {
  // 1. Feed Watchdog (CRITICAL) - Handled by RecoveryManager Supervisor now
  // But we can feed ID_SYSTEM here if we want
  // Modules::RecoveryManager::feed(Modules::ID_SYSTEM);

  // 2. Stability Check
  // ... stability check logic ...

  // 3. Serial Input (Process Commands)
  Sys::SerialHandler::update();

  // 4. Safe Mode Indicator (Fast Blink)
  if (Modules::RecoveryManager::isSafeMode()) {
    // Blink Logic
    digitalWrite(2, (millis() / 200) % 2); // Fast Blink
    delay(10);
  } else {
    // 4. Normal Loop
    Modules::LedManager::update();
    Modules::WifiManager::update();
    Modules::TideEngine::update();
    Modules::WebServerModule::update(); // Handle HTTP/DNS requests

    // 5. Touch Interaction
    auto event = Modules::TouchManager::poll();
    if (event.has_value()) {
      switch (event->type) {
      case Modules::TouchEvent::SINGLE_TAP:
        Serial.println("🍎 Action: Single Tap -> Toggle Light");
        // Demo: Toggle between algorithms or colors
        Modules::LedManager::setAnimation(Modules::LedManager::RAINBOW);
        break;
      case Modules::TouchEvent::DOUBLE_TAP:
        Serial.println("🍎 Action: Double Tap -> Next Scene");
        Modules::LedManager::setAnimation(Modules::LedManager::TIDE_WAVE);
        break;
      case Modules::TouchEvent::LONG_PRESS_START:
        Serial.println("🍎 Action: Long Press Start -> Dimming Mode");
        Modules::LedManager::setAnimation(Modules::LedManager::SOLID);
        Modules::LedManager::setAll(CRGB::Red); // Visual Feedback
        break;
      case Modules::TouchEvent::LONG_PRESS_END:
        Serial.println("🍎 Action: Long Press End");
        Modules::LedManager::setAll(CRGB::Green); // Visual Feedback
        delay(200);
        Modules::LedManager::setAnimation(Modules::LedManager::BREATHE);
        break;
      }
    }

    // Use vTaskDelay to yield to IDLE task and allow WiFi/BT handling
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}
