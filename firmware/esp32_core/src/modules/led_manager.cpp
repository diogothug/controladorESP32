#include "modules/led_manager.h"

namespace Modules {

    CRGB LedManager::leds[NUM_LEDS];
    LedManager::AnimationMode LedManager::currentMode = OFF;
    uint8_t LedManager::brightness = 128;

    void LedManager::init() {
        // Initialize FastLED
        // Note: LED_PIN and NUM_LEDS are defined in config.h
        FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
        
        // Power Protection: Limit to 5V, 1000mA (Safe for USB)
        FastLED.setMaxPowerInVoltsAndMilliamps(5, 1000);
        
        // Soft Start: Ramp up brightness to avoid thermal shock/inrush
        FastLED.setBrightness(0);
        FastLED.clear(true);
        Serial.println("[LED] FastLED Initialized (Soft Start 0->target)");
        
        // We don't set brightness immediately here; 
        // Logic in update() or setBrightness() should handle the ramp or cap.
        setBrightness(brightness); 
    }

    void LedManager::update() {
        switch (currentMode) {
            case OFF:
                // Do nothing, leds already cleared or static
                break;
            case SOLID:
                // Static color, no update needed unless changed
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

    void LedManager::setBrightness(uint8_t scale) {
        // Protection: Cap brightness at hardware safe limit
        if (scale > MAX_SAFE_BRIGHTNESS) {
            Serial.printf("[LED] Brightness clamped: %d -> %d\n", scale, MAX_SAFE_BRIGHTNESS);
            scale = MAX_SAFE_BRIGHTNESS;
        }
        brightness = scale;
        FastLED.setBrightness(scale);
    }

    void LedManager::setAll(CRGB color) {
        fill_solid(leds, NUM_LEDS, color);
    }

    void LedManager::clear() {
        FastLED.clear();
        currentMode = OFF;
    }

    void LedManager::setAnimation(AnimationMode mode) {
        currentMode = mode;
        Serial.printf("[LED] Mode set to: %d\n", mode);
    }

    // ============ ANIMATIONS ============

    void LedManager::animBreathe() {
        static float t = 0.0f;
        t += 0.05f;
        uint8_t b = (sin(t) + 1.0f) * 127.5f;
        // Breathe a nice cyan/teal color
        fill_solid(leds, NUM_LEDS, CRGB(0, b/2, b)); 
    }

    void LedManager::animRainbow() {
        static uint8_t hue = 0;
        fill_rainbow(leds, NUM_LEDS, hue++, 7);
    }

}
