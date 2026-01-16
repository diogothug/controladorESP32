#pragma once
#include "config.h"
#include <Arduino.h>
#include <FastLED.h>


namespace Modules {

class LedManager {
public:
  static void init();
  static void update();

  // Basic Control
  static void setBrightness(uint8_t scale);
  static void setAll(CRGB color);
  static void clear();

  // Animation States
  enum AnimationMode {
    OFF,
    SOLID,
    BREATHE,
    RAINBOW,
    TIDE_WAVE // Placeholder for future tide integration
  };

  static void setAnimation(AnimationMode mode);

  // Auto Brightness
  static void setAutoBrightness(bool enabled);
  static bool getAutoBrightness();
  static void updateAutoBrightness(); // Called periodically

private:
  static CRGB leds[NUM_LEDS];
  static AnimationMode currentMode;
  static uint8_t brightness;
  static bool autoBrightnessEnabled;
  static unsigned long lastAutoBrightUpdate;

  // Animation helpers
  static void animBreathe();
  static void animRainbow();
};

} // namespace Modules
