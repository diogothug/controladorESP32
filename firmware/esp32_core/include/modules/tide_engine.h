#pragma once
#include <Arduino.h>

namespace Modules {

    struct TideExtrema {
        time_t timestamp;
        float level;
        uint8_t type; // 0=Low, 1=High
    };

    class TideEngine {
    public:
        static void init();
        static void update();
        
        static float getTideLevel(); // 0.0 to 1.0 (Low to High)
        static bool isRising();

        // Offline / Cache Methods
        static bool loadCache();
        static void saveCache();
        static bool ensureDataAvailable(); // Checks 28-day limit
        static void fetchMockData(); // Logic placeholder until API
        
    private:
        static float currentLevel;
        static bool rising;
        
        // Cache
        static std::vector<TideExtrema> cache;
        static bool needsFetch;

        // Configuration for Moreré (Example Harmonic Constants)
        // Ideally we'd valid these against the Python model later
        static constexpr double M2_AMPLITUDE = 1.0; 
        static constexpr double M2_PHASE = 0.0;
        static constexpr double M2_SPEED = 28.9841042; // deg/hour
    };

}
