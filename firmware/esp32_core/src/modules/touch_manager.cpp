#include "modules/touch_manager.h"
#include "config.h"

namespace Modules {

TouchManager::State TouchManager::currentState = IDLE;
bool TouchManager::lastRawState = false;
uint32_t TouchManager::lastRawChange = 0;
bool TouchManager::stableState = false;
uint32_t TouchManager::touchStartMs = 0;
uint32_t TouchManager::firstTapReleaseMs = 0;

// Config defaults
TouchManager::TouchMode TouchManager::currentMode = MODE_DIGITAL;
uint16_t TouchManager::touchThreshold = 40;
uint16_t TouchManager::lastRawValue = 0;

void TouchManager::init() {
  // Mode specific setup
  if (currentMode == MODE_DIGITAL) {
    pinMode(PIN_TOUCH_SENSOR, INPUT);
    Serial.printf("[TouchManager] Init DIGITAL on Pin %d\n", PIN_TOUCH_SENSOR);
  } else {
    // Native mode doesn't need pinMode, but debug log is good
    Serial.printf("[TouchManager] Init NATIVE on Pin %d (Thresh: %d)\n",
                  PIN_TOUCH_SENSOR, touchThreshold);
  }

  // Stabilize initial state
  delay(50);
  bool reading = false;

  if (currentMode == MODE_DIGITAL) {
    reading = digitalRead(PIN_TOUCH_SENSOR);
  } else {
    // For native, read a few times
    reading = (touchRead(PIN_TOUCH_SENSOR) < touchThreshold);
  }

  // Manual Reset to synced state
  currentState = IDLE;
  lastRawState = reading;
  stableState = reading;
  lastRawChange = millis();
  touchStartMs = 0;
  firstTapReleaseMs = 0;
}

void TouchManager::setMode(TouchMode mode) {
  currentMode = mode;
  init(); // Re-init hardware if needed
}

void TouchManager::setThreshold(uint16_t threshold) {
  touchThreshold = threshold;
  Serial.printf("[TouchManager] Threshold set to %d\n", threshold);
}

uint16_t TouchManager::getThreshold() { return touchThreshold; }
TouchManager::TouchMode TouchManager::getMode() { return currentMode; }
uint16_t TouchManager::getLastRawReading() { return lastRawValue; }

void TouchManager::reset() {
  // Default clean reset (assuming LOW)
  currentState = IDLE;
  lastRawState = false;
  stableState = false;
  lastRawChange = 0;
  touchStartMs = 0;
  firstTapReleaseMs = 0;
}

std::optional<TouchEvent> TouchManager::poll() {
  uint32_t now = millis();

  // [LLVM-OPT] Throttling: polling INTENSIVE hardware (touchRead) every cycle
  // is wasteful. Limit to ~50Hz (20ms) which is faster than human reaction but
  // saves CPU.
  static uint32_t lastPollTime = 0;
  if (now - lastPollTime < 20) {
    return std::nullopt;
  }
  lastPollTime = now;

  bool readNow = false;

  if (currentMode == MODE_DIGITAL) {
    readNow = digitalRead(PIN_TOUCH_SENSOR);
  } else {
    // NATIVE
    lastRawValue = touchRead(PIN_TOUCH_SENSOR);
    // Native Touch: Value DROPS when touched
    readNow = (lastRawValue < touchThreshold);
  }

  // 1. Debounce
  if (readNow != lastRawState) {
    lastRawChange = now;
    lastRawState = readNow;
  }

  if ((now - lastRawChange) > DEBOUNCE_MS) {
    stableState = lastRawState;
  }

  bool debouncedState = stableState;

  // 2. State Machine
  std::optional<TouchEvent> event = std::nullopt;

  switch (currentState) {
  case IDLE:
    if (debouncedState) { // Touch Down
      currentState = TOUCHING;
      touchStartMs = now;
    }
    break;

  case TOUCHING:
    if (!debouncedState) { // Touch Up
      uint32_t duration = now - touchStartMs;
      if (duration <= TAP_MAX_MS) {
        // Valid Tap, go to wait for potential second tap
        currentState = WAIT_DOUBLE;
        firstTapReleaseMs = now;
      } else {
        currentState = IDLE;
      }
    } else {
      // Still Holding, check Long Press
      if ((now - touchStartMs) >= LONG_PRESS_MS) {
        currentState = LONG_ACTIVE;
        event = TouchEvent{TouchEvent::LONG_PRESS_START, now};
      }
    }
    break;

  case WAIT_DOUBLE:
    if (debouncedState) { // Second Touch Down
      currentState = SECOND_TOUCHING;
    } else {
      // Still waiting
      if ((now - firstTapReleaseMs) > DOUBLE_TAP_MS) {
        // Timeout! It was a single tap.
        currentState = IDLE;
        event = TouchEvent{TouchEvent::SINGLE_TAP, now};
      }
    }
    break;

  case SECOND_TOUCHING:
    if (!debouncedState) { // Second Touch Up
      currentState = IDLE;
      event = TouchEvent{TouchEvent::DOUBLE_TAP, now};
    }
    break;

  case LONG_ACTIVE:
    // Ignore all jitter/taps until release
    if (!debouncedState) {
      currentState = IDLE;
      event = TouchEvent{TouchEvent::LONG_PRESS_END, now};
    }
    break;
  }

  return event;
}

} // namespace Modules
