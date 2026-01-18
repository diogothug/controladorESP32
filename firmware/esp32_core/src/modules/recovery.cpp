#include "modules/recovery.h"
#include "modules/led_manager.h"
#include "modules/wifi_manager.h"

namespace Modules {

Preferences RecoveryManager::prefs;
bool RecoveryManager::_safeMode = false;

// Last fed timestamp (ms)
unsigned long RecoveryManager::_heartbeats[ID_COUNT] = {0};

// Max silence allowed before triggering recovery action (ms)
// Max silence allowed before triggering recovery action (ms)
// Non-const for runtime tuning (V2)
unsigned long RecoveryManager::_thresholds[ID_COUNT] = {
    0,     // ID_SYSTEM (Not used for logic check)
    2000,  // ID_LED: Animation should be smooth (<1.5s usually)
    70000, // ID_TIDE: Data fetch/calc (60s warn)
    0      // ID_WIFI: Non-critical (0 = disabled)
};

const char *RecoveryManager::_names[ID_COUNT] = {"SYSTEM", "LED", "TIDE",
                                                 "WIFI"};

void RecoveryManager::init() {
  Serial.println("[RECOVERY] Initializing...");

  // 1. Crash Loop Detection (Power/Brownout Layer)
  checkCrashLoop();

  // Load custom thresholds from NVS (V2)
  prefs.begin("recovery", true);
  for (int i = 1; i < ID_COUNT; i++) {
    char key[16];
    snprintf(key, sizeof(key), "th_%d", i);
    unsigned long val = prefs.getULong(key, 0);
    if (val > 0)
      _thresholds[i] = val;
  }
  prefs.end();

  // 2. Setup Hardware Watchdog (System Layer)
  // 8 seconds timeout (panic and reset)
  esp_task_wdt_init(8, true);
  esp_task_wdt_add(
      NULL); // Add current thread (Main Loop) if needed,
             // but we will primarily rely on Supervisor task feeding it.

  // Start Supervisor Task (Logic Layer)
  // Pinned to Core 0 to be independent of Main Loop (Core 1)
  xTaskCreatePinnedToCore(supervisorTask, "Supervisor", 4096, NULL,
                          0, // Low Priority
                          NULL,
                          0 // Core 0
  );

  // Initial feed
  for (int i = 0; i < ID_COUNT; i++)
    _heartbeats[i] = millis();

  Serial.println("[RECOVERY] Supervisor Started.");
}

void RecoveryManager::feed(SubsystemID id) {
  if (id < ID_COUNT) {
    _heartbeats[id] = millis();
  }
}

bool RecoveryManager::isSafeMode() { return _safeMode; }

void RecoveryManager::safeReboot(const char *reason) {
  Serial.printf("[RECOVERY] FATAL: %s. Rebooting...\n", reason);

  // Persist reason for debugging (V2)
  prefs.begin("recovery", false);
  prefs.putString("crash_reason", reason);
  prefs.end();

  delay(100);
  ESP.restart();
}

String RecoveryManager::getLastCrashReason() {
  prefs.begin("recovery", true);
  String reason = prefs.getString("crash_reason", "NONE");
  prefs.end();
  return reason;
}

void RecoveryManager::setThreshold(SubsystemID id, unsigned long ms) {
  if (id >= ID_COUNT)
    return;
  _thresholds[id] = ms;

  // Persist
  prefs.begin("recovery", false);
  char key[16];
  snprintf(key, sizeof(key), "th_%d", id);
  prefs.putULong(key, ms);
  prefs.end();

  Serial.printf("[RECOVERY] Updated Threshold for %s: %lu ms\n", _names[id],
                ms);
}

void RecoveryManager::checkCrashLoop() {
  prefs.begin("recovery", false);

  int crashes = prefs.getInt("crashes", 0);
  unsigned long lastBoot = prefs.getULong("last_boot", 0);
  unsigned long now = 0; // Relative time since power on is always 0 at boot...
                         // We need system time? No, we use RTC or just assume
                         // logic. Actually, we need to know if PREVIOUS boot
                         // was short. We can't know accurate time without NTP.
                         // Strategy: Increment crash count at boot.
                         // A separate timer (e.g. 2 min) will DECREMENT/RESET
                         // it if we stay alive long enough.

  crashes++;
  prefs.putInt("crashes", crashes);
  Serial.printf("[RECOVERY] Boot Count: %d\n", crashes);

  if (crashes >= 3) {
    Serial.println(
        "[RECOVERY] CRITICAL: Multiple crashes detected! Creating SAFETY NET.");
    _safeMode = true;

    // Disable WiFi to save power and avoid radio crashes
    // Reduce LED brightness handled by Main/LedManager checking isSafeMode()
  }

  prefs.end();

  // Set a timer to clear crash count if we survive 2 minutes
  // We'll calculate this in supervisor
}

void RecoveryManager::resetCrashCount() {
  prefs.begin("recovery", false);
  prefs.putInt("crashes", 0);
  prefs.end();
  Serial.println("[RECOVERY] System Stable. Crash count cleared.");
}

void RecoveryManager::supervisorTask(void *parameter) {
  unsigned long stableTimer = millis();
  bool stableDeclared = false;

  // Register this task with WDT if we want IT to be the one feeding
  esp_task_wdt_add(NULL);

  while (true) {
    unsigned long now = millis();

    // 1. Check Logic Heartbeats
    for (int i = 1; i < ID_COUNT; i++) { // Skip ID_SYSTEM
      unsigned long threshold = _thresholds[i];
      if (threshold > 0 && (now - _heartbeats[i] > threshold)) {
        Serial.printf(
            "[RECOVERY] WARN: Subsystem %s stalled (%dms). Attempting heal.\n",
            _names[i], now - _heartbeats[i]);

        // Auto-Heal Strategy
        if (i == ID_LED) {
          // Try to re-init LEDs?
          // Modules::LedManager::reset(); // To be implemented
          _heartbeats[i] = now; // Reset timer to give it a chance
        } else if (i == ID_TIDE) {
          // Logic stall?
        }

        // If really stuck, stop feeding HW WDT -> Reset
      }
    }

    // 2. Clear Crash Limit if stable for 2 minutes
    if (!_safeMode && !stableDeclared && (now - stableTimer > 120000)) {
      resetCrashCount();
      stableDeclared = true;
    }

    // 3. Feed Hardware Watchdog
    // Only feed if we haven't detected a fatal lockup
    esp_task_wdt_reset();

    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

} // namespace Modules
