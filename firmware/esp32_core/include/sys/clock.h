#pragma once
#include <Arduino.h>

namespace Sys {

    struct TimeInfo {
        time_t epoch;
        long ms;
        bool isSet;
    };

    /**
     * @brief Initialize internal timekeeping.
     */
    void initClock();

    /**
     * @brief Sync time via NTP.
     * Note: Requires WiFi to be connected.
     * @return True if sync successful.
     */
    bool syncNtp();

    /**
     * @brief Get current robust timestamp.
     * Calculated from last sync + millis() offset.
     */
    time_t getEpoch();

    /**
     * @brief Check if time has been synchronized at least once.
     */
    bool isTimeSet();

}
