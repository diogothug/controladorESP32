#pragma once
#include <Arduino.h>

namespace Sys {

    /**
     * @brief Initialize the Hardware Watchdog Timer
     * @param timeoutSeconds Time in seconds before reset if not fed
     */
    void initWatchdog(int timeoutSeconds);

    /**
     * @brief Feed the watchdog to prevent reset.
     * Call this in the main loop.
     */
    void feedWatchdog();

}
