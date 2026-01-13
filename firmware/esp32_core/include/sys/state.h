#pragma once
#include <Arduino.h>

namespace Sys {

    // Boot modes
    enum class BootMode {
        NORMAL,
        SAFE_MODE,
        RECOVERY
    };

    struct SystemState {
        int crashCount;
        BootMode bootMode;
    };

    void initState();
    void saveState();
    SystemState& getState(); // Singleton access
    
    void incrementCrashCount();
    void clearCrashCount();
    
    void setBootMode(BootMode mode);
}
