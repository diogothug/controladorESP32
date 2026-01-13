#include "sys/watchdog.h"
#include <esp_task_wdt.h>

namespace Sys {

    void initWatchdog(int timeoutSeconds) {
        // Initialize Task Watchdog Timer
        // Note: In Arduino-ESP32 v2.0+, TWDT is often enabled by default.
        // We reconfigure it to be sure.
        
        esp_task_wdt_init(timeoutSeconds, true); // true = panic (reset) on expiry
        esp_task_wdt_add(NULL); // Add current thread (loopTask) to WDT
        
        Serial.printf("[SYS] Watchdog enabled: %d seconds\n", timeoutSeconds);
    }

    void feedWatchdog() {
        esp_task_wdt_reset();
    }

}
