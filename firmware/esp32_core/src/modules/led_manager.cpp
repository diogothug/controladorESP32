#include "modules/led_manager.h"
#include "modules/recovery.h"

namespace Modules {

CRGB LedManager::leds[NUM_LEDS];
LedManager::AnimationMode LedManager::currentMode = OFF;
uint8_t LedManager::brightness = 128;
bool LedManager::autoBrightnessEnabled = false;
unsigned long LedManager::lastAutoBrightUpdate = 0;

void LedManager::init() {
  // ... existing init ...
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setMaxPowerInVoltsAndMilliamps(5, 1000);
  FastLED.setBrightness(0);
  FastLED.clear(true);
  Serial.println("[LED] FastLED Initialized");

  // Restore defaults or load from NVS (Future)
  // For now, start with middle brightness
  setBrightness(brightness);
}

void LedManager::update() {
  // Heartbeat for Watchdog
  RecoveryManager::feed(ID_LED);

  // Safe Mode Override
  if (RecoveryManager::isSafeMode()) {
    FastLED.setBrightness(10); // Force low brightness
    return;                    // Skip animation updates in safe mode
  }

  // Safe Mode Override
  if (RecoveryManager::isSafeMode()) {
    FastLED.setBrightness(10); // Force low brightness
    // TODO: Force simple animation if needed using currentAnimation = ...
  }

  // ... existing logic ...
  // Periodic Auto Brightness Check (every 60s)
  if (autoBrightnessEnabled) {
    if (millis() - lastAutoBrightUpdate > 60000) {
      updateAutoBrightness();
      lastAutoBrightUpdate = millis();
    }
  }

  switch (currentMode) {
  case OFF:
    break;
  case SOLID:
    break;
  case BREATHE:
    animBreathe();
    break;
  case RAINBOW:
    animRainbow();
    break;
  default:
    break;
  }
  FastLED.show();
}

void LedManager::setAutoBrightness(bool enabled) {
  autoBrightnessEnabled = enabled;
  Serial.printf("[LED] Auto Brightness: %s\n", enabled ? "ON" : "OFF");
  if (enabled)
    updateAutoBrightness(); // Force immediate update
}

bool LedManager::getAutoBrightness() { return autoBrightnessEnabled; }

void LedManager::updateAutoBrightness() {
  // Logic:
  // 06:00 - 18:00 (Day) -> High (150)
  // 18:00 - 22:00 (Evening) -> Medium (80)
  // 22:00 - 06:00 (Night) -> Low (10)

  // Dependency: Sys::Clock needs to be synced
  // We can get hour from Sys::Clock (assuming it exposes helper or struct tm)
  // For now, let's assume we can get hour string or int from Clock module if
  // accessible, otherwise we might need to modify Clock to expose time_t or
  // hour.

  // Simplified check using standard time if available
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    // Clock not set yet
    return;
  }

  int hour = timeinfo.tm_hour;
  uint8_t target = 50; // Default fallback

  if (hour >= 6 && hour < 18) {
    target = 180; // Day
  } else if (hour >= 18 && hour < 22) {
    target = 80; // Evening
  } else {
    target = 10; // Late Night
  }

  // Smooth transition?
  // For now, direct set.
  if (brightness != target) {
    Serial.printf("[LED] Auto-Adj Brightness: %d -> %d (Hour: %d)\n",
                  brightness, target, hour);
    setBrightness(target);
  }
}

void LedManager::setBrightness(uint8_t scale) {
  // Protection
  if (scale > MAX_SAFE_BRIGHTNESS)
    scale = MAX_SAFE_BRIGHTNESS;

  brightness = scale;
  FastLED.setBrightness(scale);
}

// ... rest of file (setAll, clear, setAnimation, anims ...)

void LedManager::setAll(CRGB color) { fill_solid(leds, NUM_LEDS, color); }

void LedManager::clear() {
  FastLED.clear();
  currentMode = OFF;
}

void LedManager::setAnimation(AnimationMode mode) {
  currentMode = mode;
  Serial.printf("[LED] Mode set to: %d\n", mode);
}

// ============ ANIMATIONS ============

// [LLVM-OPT] Replaced inefficient float sin() with FastLED 8-bit integer math
// (beatsin8)
void LedManager::animBreathe() {
  // 12 BPM = ~5s cycle, similar to previous speed
  uint8_t b = beatsin8(12, 10, 255);
  // Breathe a nice cyan/teal color (Blue-Green)
  // map brightness to color components
  fill_solid(leds, NUM_LEDS, CRGB(0, scale8(b, 128), b));
}

void LedManager::animRainbow() {
  static uint8_t hue = 0;
  fill_rainbow(leds, NUM_LEDS, hue++, 7);
}

} // namespace Modules
