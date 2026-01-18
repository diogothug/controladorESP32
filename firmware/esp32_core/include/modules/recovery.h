#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include <esp_task_wdt.h>

namespace Modules {

enum SubsystemID {
  ID_SYSTEM = 0,
  ID_LED,
  ID_TIDE,
  ID_WIFI,
  ID_COUNT // Helper for array size
};

class RecoveryManager {
public:
  static void init();

  // Called by other modules to say "I'm alive"
  static void feed(SubsystemID id);

  // Checks if we are in "Safe Mode" (due to repeated crashes)
  static bool isSafeMode();

  // Force a safe reboot
  static void safeReboot(const char *reason);

  // V2: Dynamic Visibility & Config
  static String getLastCrashReason();
  static void setThreshold(SubsystemID id, unsigned long ms);

private:
  static Preferences prefs;
  static bool _safeMode;
  static unsigned long _heartbeats[ID_COUNT];
  static unsigned long _thresholds[ID_COUNT]; // Now mutable
  static const char *_names[ID_COUNT];

  // Supervisor Task
  static void supervisorTask(void *parameter);

  // Crash Counting Logic
  static void checkCrashLoop();
  static void resetCrashCount();
};

} // namespace Modules
