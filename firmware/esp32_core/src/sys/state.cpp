#include "sys/state.h"
#include <Preferences.h>
#include "config.h"

namespace Sys {

    static Preferences prefs;
    static SystemState currentState;
    static bool initialized = false;

    void initState() {
        if (initialized) return;

        prefs.begin("system", false); // Namespace "system", RW mode

        currentState.crashCount = prefs.getInt("crash_cnt", 0);
        int mode = prefs.getInt("boot_mode", (int)BootMode::NORMAL);
        currentState.bootMode = static_cast<BootMode>(mode);

        Serial.printf("[SYS] State Loaded: CrashCount=%d, BootMode=%d\n", 
                      currentState.crashCount, (int)currentState.bootMode);
        
        initialized = true;
    }

    void saveState() {
        if (!initialized) return;
        prefs.putInt("crash_cnt", currentState.crashCount);
        prefs.putInt("boot_mode", (int)currentState.bootMode);
    }

    SystemState& getState() {
        if (!initialized) initState();
        return currentState;
    }

    void incrementCrashCount() {
        if (!initialized) initState();
        currentState.crashCount++;
        prefs.putInt("crash_cnt", currentState.crashCount);
        Serial.printf("[SYS] Crash Count Incremented: %d\n", currentState.crashCount);
    }

    void clearCrashCount() {
        if (!initialized) initState();
        currentState.crashCount = 0;
        prefs.putInt("crash_cnt", 0);
    }

    void setBootMode(BootMode mode) {
        if (!initialized) initState();
        currentState.bootMode = mode;
        saveState();
    }

}
