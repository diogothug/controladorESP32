#pragma once
#include <Arduino.h>
#include <WiFi.h>

namespace Modules {

    class WifiManager {
    public:
        static void init();
        static void update();
        static bool isConnected();
        
        // Configuration (Ideally loaded from NVS or Config file)
        static void setCredentials(const char* ssid, const char* password);

    private:
        static unsigned long lastCheck;
        static unsigned long reconnectInterval;
        static const unsigned long INITIAL_RECONNECT_INTERVAL = 5000;
        static const unsigned long MAX_RECONNECT_INTERVAL = 300000; // 5 mins
        static int retryCount;
        static const int AP_FALLBACK_THRESHOLD = 3;

        static bool _connected;
        static bool _apMode;
        
        static void onEvent(WiFiEvent_t event);
        static void startAP();
    };

}
