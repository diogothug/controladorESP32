#include "modules/wifi_manager.h"
#include "sys/clock.h"
#include <Preferences.h>

namespace Modules {

    unsigned long WifiManager::lastCheck = 0;
    unsigned long WifiManager::reconnectInterval = INITIAL_RECONNECT_INTERVAL;
    int WifiManager::retryCount = 0;
    bool WifiManager::_connected = false;
    bool WifiManager::_apMode = false;

    // Defaults (overwritten by NVS)
    String wifi_ssid_str = "Moreré_Guest";
    String wifi_pass_str = "tide1234";

    Preferences wifiPrefs;

    void WifiManager::init() {
        WiFi.mode(WIFI_STA);
        WiFi.onEvent(onEvent);
        
        // Load from NVS
        wifiPrefs.begin("wifi", true); // Read-only
        wifi_ssid_str = wifiPrefs.getString("ssid", wifi_ssid_str);
        wifi_pass_str = wifiPrefs.getString("pass", wifi_pass_str);
        wifiPrefs.end();

        // Initial connection attempt
        Serial.printf("[WIFI] Connecting to %s...\n", wifi_ssid_str.c_str());
        WiFi.begin(wifi_ssid_str.c_str(), wifi_pass_str.c_str());
        lastCheck = millis();
    }

    void WifiManager::update() {
        if (_apMode) return; // In AP mode, we wait for user action (or reboot)

        // Robust Reconnect Logic
        if ((WiFi.status() != WL_CONNECTED) && (millis() - lastCheck > reconnectInterval)) {
            Serial.printf("[WIFI] Reconnecting... Attempt %d (Interval: %ds)\n", retryCount + 1, reconnectInterval / 1000);
            
            WiFi.disconnect();
            WiFi.reconnect();
            
            lastCheck = millis();
            retryCount++;
            
            // Exponential Backoff
            reconnectInterval = min(MAX_RECONNECT_INTERVAL, reconnectInterval * 2);

            // AP Fallback
            if (retryCount >= AP_FALLBACK_THRESHOLD) {
                startAP();
            }
        }
    }

    void WifiManager::startAP() {
        Serial.println("[WIFI] Failed to connect. Starting AP Mode...");
        WiFi.disconnect();
        WiFi.mode(WIFI_AP);
        WiFi.softAP("TideDisplay_Recovery");
        Serial.printf("[WIFI] AP Started: TideDisplay_Recovery (IP: %s)\n", WiFi.softAPIP().toString().c_str());
        _apMode = true;
        
        // Signal Error via LED (Optional, could call LedManager::setError())
        // Important: Ensure WebServer is reachable!
    }

    bool WifiManager::isConnected() {
        return _connected;
    }

    void WifiManager::onEvent(WiFiEvent_t event) {
        switch (event) {
            case ARDUINO_EVENT_WIFI_STA_GOT_IP:
                Serial.printf("[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
                _connected = true;
                retryCount = 0;
                reconnectInterval = INITIAL_RECONNECT_INTERVAL;
                // Sync Time immediately on connection
                Sys::syncNtp();
                break;
            case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
                Serial.println("[WIFI] Disconnected");
                _connected = false;
                break;
            default:
                break;
        }
    }

    void WifiManager::setCredentials(const char* ssid, const char* password) {
        wifiPrefs.begin("wifi", false); // Read-write
        wifiPrefs.putString("ssid", ssid);
        wifiPrefs.putString("pass", password);
        wifiPrefs.end();
        Serial.println("[WIFI] Credentials saved to NVS");
    }

}
