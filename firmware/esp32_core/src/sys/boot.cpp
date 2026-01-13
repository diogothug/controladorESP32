#include "sys/boot.h"
#include "sys/state.h"
#include "config.h"
#include <Arduino.h>

namespace Sys {

    bool checkBoot() {
        // Init state system first
        initState();
        SystemState& state = getState();

        // Check if we are in a crash loop
        if (state.crashCount >= CRASH_THRESHOLD) {
            Serial.println("!!! SYSTEM UNSTABLE - ENTERING SAFE MODE !!!");
            setBootMode(BootMode::SAFE_MODE);
            return false;
        }

        // Check explicit safe mode request
        if (state.bootMode == BootMode::SAFE_MODE) {
            Serial.println("[BOOT] Safe Mode flag active.");
            return false;
        }

        // If we got here, we assume a normal boot attempt.
        // We increment crash count momentarily; if we stabilize (run for X seconds), we'll clear it.
        // This detects "Crash on Boot".
        incrementCrashCount();
        
        Serial.println("[BOOT] Normal Mode - Crash Counter Incremented (Tentative)");
        return true;
    }

}
