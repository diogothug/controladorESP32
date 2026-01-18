#include "modules/wifi_manager.h"
#include "modules/recovery.h"
#include "sys/clock.h"
#include <Preferences.h>
#include <algorithm>


namespace Modules {

unsigned long WifiManager::lastCheck = 0;
unsigned long WifiManager::lastAttemptTime = 0;
unsigned long WifiManager::lastConnectionTime = 0;
unsigned long WifiManager::reconnectInterval = INITIAL_RECONNECT_INTERVAL;
int WifiManager::retryCount = 0;
bool WifiManager::_connected = false;
bool WifiManager::_apMode = false;

std::vector<WifiCred> WifiManager::storedCreds;
int WifiManager::currentCredIndex = 0;

Preferences wifiPrefs;

// Include moved to top

void WifiManager::init() {
  // Safe Mode Check: Disable WiFi entirely
  if (RecoveryManager::isSafeMode()) {
    Serial.println("[WIFI] Safe Mode Active: WiFi Disabled.");
    WiFi.mode(WIFI_OFF);
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.onEvent(onEvent);

  loadCreds();

  if (storedCreds.empty()) {
    Serial.println("[WIFI] No stored credentials. Starting AP.");
    startAP();
  } else {
    // Start with the most recently used (index 0 after sort)
    currentCredIndex = 0;
    tryNextCred();
  }
}

void WifiManager::update() {
  RecoveryManager::feed(ID_WIFI);

  if (_apMode)
    return;

  if (_connected) {
    lastConnectionTime = millis();
    return;
  }

  unsigned long now = millis();

  // 1. AP Fallback: If disconnected for > 5 mins (regardless of how many
  // networks we tried) Note: Only if we have actually tried connecting
  // (lastConnectionTime > 0 or initialized)
  if (lastConnectionTime > 0 || now > AP_TIMEOUT) {
    if (now - lastConnectionTime > AP_TIMEOUT) {
      startAP();
      return;
    }
  } else {
    // Just started, give it some grace time before AP?
    // Actually lastConnectionTime is 0 on boot until connected.
    // Let's set lastConnectionTime to boot time if 0? No, let's assume now - 0
    // > Timeout If we never connected, lastConnectionTime is 0. We should check
    // if we cycled through all creds multiple times? Let's stick to time-based.
    if (now > AP_TIMEOUT) {
      startAP();
      return;
    }
  }

  // 2. Retry Logic
  // If we are not connected, we might be attempting (WiFi.status() !=
  // WL_CONNECTED) But WiFi.begin() is async. We check status periodically?
  // Actually onEvent handles success/fail triggers mostly.
  // But if begin() fails silently or hangs, we need a timeout for the attempt.

  // If we are attempting (implied by !connected)
  if (now - lastAttemptTime > 15000) { // 15s timeout per attempt
    Serial.println("[WIFI] Connection attempt timed out.");
    WiFi.disconnect();
    tryNextCred();
  }
}

void WifiManager::tryNextCred() {
  if (storedCreds.empty()) {
    // No creds, nothing to do (AP mode should handle)
    return;
  }

  // Advance index if we exhausted retries for current
  retryCount++;
  if (retryCount > MAX_RETRIES_PER_CRED) {
    retryCount = 0;
    currentCredIndex++;
    if (currentCredIndex >= storedCreds.size()) {
      currentCredIndex = 0; // Loop back to best
      // We completed a full cycle. Maybe increase wait time?
      // For now, just loop.
      Serial.println("[WIFI] Cycle complete. restarting list.");
    }
  }

  WifiCred &cred = storedCreds[currentCredIndex];

  Serial.printf("[WIFI] Trying network (%d/%d): %s\n", currentCredIndex + 1,
                storedCreds.size(), cred.ssid.c_str());

  WiFi.disconnect();
  WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
  lastAttemptTime = millis();
  lastCheck = millis();
}

void WifiManager::startAP() {
  Serial.println("[WIFI] Starting AP Mode...");
  WiFi.disconnect();
  WiFi.mode(WIFI_AP);
  WiFi.softAP("TideDisplay_Recovery");
  Serial.printf("[WIFI] AP Started (IP: %s)\n",
                WiFi.softAPIP().toString().c_str());
  _apMode = true;
}

bool WifiManager::isConnected() { return _connected; }

void WifiManager::onEvent(WiFiEvent_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.printf("[WIFI] Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    _connected = true;
    retryCount = 0;

    // Update timestamp and resort
    if (!storedCreds.empty() && currentCredIndex < storedCreds.size()) {
      storedCreds[currentCredIndex].lastUsed =
          millis(); // Approximate relative usage
      // Ideally use Real time if possible, but relative millis works for "most
      // recent this session" To persist across boots better, we might need
      // value from RTC or just increment a counter. Let's use a simple counter
      // approach? Or system time if NTP synced. Since we sync NTP right after,
      // let's wait? Actually saveCreds() will preserve order.
      saveCreds(); // Save immediately with new priority (sort happens
                   // implicitly or next load)
    }

    // Move current successful cred to top and save
    if (!storedCreds.empty() && currentCredIndex != 0) {
      // Swap to front? Or just sort?
      // Let's just update 'lastUsed' to ULONG_MAX (most recent) temporarily?
      // Better: explicit move.
      std::rotate(storedCreds.begin(),
                  storedCreds.begin() + currentCredIndex + 1,
                  storedCreds.end()); // Wait, rotate logic tricky.
      // Simplest: Erase and Insert at 0
      WifiCred c = storedCreds[currentCredIndex];
      storedCreds.erase(storedCreds.begin() + currentCredIndex);
      storedCreds.insert(storedCreds.begin(), c);
      currentCredIndex = 0;
      saveCreds();
    }

    Sys::syncNtp();
    break;

  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    if (_connected) {
      Serial.println("[WIFI] Disconnected.");
      _connected = false;
      lastConnectionTime = millis(); // Reset timeout timer
      // If we were connected, we stick to this cred for a bit before switching?
      // Usually immediate retry on same cred is good.
    }
    // Logic update() will handle retry/rotation upon timeout.
    // But we can trigger immediate next if explicit disconnect failure?
    // No, legitimate disconnects happen. Let update() handle timeout.
    // Or trigger fast retry?
    break;

  default:
    break;
  }
}

// === NVS Logic ===

void WifiManager::loadCreds() {
  wifiPrefs.begin("wifi", true);
  storedCreds.clear();

  size_t count = wifiPrefs.getUInt("count", 0);
  if (count > MAX_CREDS)
    count = MAX_CREDS;

  for (size_t i = 0; i < count; i++) {
    String p = String(i);
    String ssid = wifiPrefs.getString(("s" + p).c_str(), "");
    String pass = wifiPrefs.getString(("p" + p).c_str(), "");
    if (ssid.length() > 0) {
      storedCreds.push_back({ssid, pass, 0});
    }
  }
  wifiPrefs.end();
  Serial.printf("[WIFI] Loaded %d credentials\n", storedCreds.size());
}

void WifiManager::saveCreds() {
  wifiPrefs.begin("wifi", false);
  wifiPrefs.putUInt("count", storedCreds.size());

  for (size_t i = 0; i < storedCreds.size(); i++) {
    String p = String(i);
    wifiPrefs.putString(("s" + p).c_str(), storedCreds[i].ssid);
    wifiPrefs.putString(("p" + p).c_str(), storedCreds[i].pass);
  }
  wifiPrefs.end();
}

void WifiManager::setCredentials(const char *ssid, const char *password) {
  // Check if exists
  String newSsid = String(ssid);
  String newPass = String(password);

  for (auto it = storedCreds.begin(); it != storedCreds.end(); ++it) {
    if (it->ssid == newSsid) {
      storedCreds.erase(it);
      break;
    }
  }

  // Insert at top
  storedCreds.insert(storedCreds.begin(), {newSsid, newPass, millis()});

  // Trim
  if (storedCreds.size() > MAX_CREDS) {
    storedCreds.resize(MAX_CREDS);
  }

  saveCreds();

  // Force try new
  currentCredIndex = 0;
  retryCount = 0;
  tryNextCred();
}

} // namespace Modules
