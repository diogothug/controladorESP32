#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <vector>

namespace Modules {

struct WifiCred {
  String ssid;
  String pass;
  unsigned long lastUsed; // timestamp (millis or unix if available)
};

class WifiManager {
public:
  static void init();
  static void update();
  static bool isConnected();

  // Configuration
  static void setCredentials(const char *ssid, const char *password);

private:
  static unsigned long lastCheck;
  static unsigned long lastAttemptTime; // Time of last connection attempt
  static unsigned long reconnectInterval;
  static const unsigned long INITIAL_RECONNECT_INTERVAL = 2000;

  // Requirements: 5 min disconnect -> AP
  // Retry strategy: Try current cred. If fail, switch to next.
  // Cycle through all creds before increasing wait time?
  static const unsigned long AP_TIMEOUT = 300000; // 5 mins
  static const unsigned long RECONNECT_INTERVAL_FIXED =
      60000; // 1 min max between cycles?

  static unsigned long lastConnectionTime;

  static int retryCount;
  static const int MAX_RETRIES_PER_CRED =
      2; // Try each cred 2 times before switching

  static bool _connected;
  static bool _apMode;

  // Credential History
  static std::vector<WifiCred> storedCreds;
  static int currentCredIndex; // Index of credential currently being tried
  static const size_t MAX_CREDS = 10;

  static void loadCreds();
  static void saveCreds();
  static void sortCreds(); // Sort by lastUsed descending
  static void tryNextCred();

  static void onEvent(WiFiEvent_t event);
  static void startAP();
};

} // namespace Modules
