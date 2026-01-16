#pragma once
#include <Arduino.h>
#include <optional>

namespace Modules {

struct TouchEvent {
  enum Type { SINGLE_TAP, DOUBLE_TAP, LONG_PRESS_START, LONG_PRESS_END } type;

  uint32_t timestamp;
};

class TouchManager {
public:
  static void init();
  static void reset(); // Use for testing
  // Returns an event if one occurred, otherwise std::nullopt
  static std::optional<TouchEvent> poll();

  // Configuration
  enum TouchMode {
    MODE_DIGITAL, // Use digitalRead (TTP223 etc)
    MODE_NATIVE   // Use touchRead (ESP32 Native)
  };

  static void setMode(TouchMode mode);
  static void setThreshold(uint16_t threshold);
  static uint16_t getThreshold();
  static TouchMode getMode();
  static uint16_t getLastRawReading(); // For calibration streaming

  // Premium Timings (Apple-like feel)
  static constexpr uint32_t DEBOUNCE_MS = 40;
  static constexpr uint32_t TAP_MAX_MS = 200;
  static constexpr uint32_t DOUBLE_TAP_MS = 300;
  static constexpr uint32_t LONG_PRESS_MS = 600;

private:
  enum State { IDLE, TOUCHING, WAIT_DOUBLE, SECOND_TOUCHING, LONG_ACTIVE };

  static State currentState;
  static bool lastRawState;
  static uint32_t lastRawChange;

  // Config settings
  static TouchMode currentMode;
  static uint16_t
      touchThreshold; // Recommended: ~40-50, but depends on pin/wire
  static uint16_t lastRawValue;

  // State tracking
  static bool stableState;
  static uint32_t touchStartMs;
  static uint32_t firstTapReleaseMs; // For double tap window
};

} // namespace Modules
