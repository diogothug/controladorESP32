#include "sys/clock.h"
#include <Preferences.h>
#include <sys/time.h>
#include <time.h>


namespace Sys {

static bool _timeSet = false;
static Preferences prefs; // For time persistence
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = -10800; // default to BRT (UTC-3)
const int daylightOffset_sec = 0;

time_t getEpoch() {
  time_t now;
  time(&now);
  return now;
}

void saveTime() {
  prefs.begin("time", false);
  time_t now = getEpoch();
  if (now > 1000000) { // Basic validity check
    prefs.putLong("epoch", (int32_t)now);
    Serial.printf("[CLOCK] Time Saved: %ld\n", now);
  }
  prefs.end();
}

void loadTime() {
  prefs.begin("time", true); // ReadOnly
  time_t saved = (time_t)prefs.getLong("epoch", 0);
  prefs.end();

  if (saved > 1000000) {
    // Restore time
    struct timeval tv;
    tv.tv_sec = saved;
    tv.tv_usec = 0;
    settimeofday(&tv, NULL);
    _timeSet = true; // Mark as set (tentatively)
    Serial.printf("[CLOCK] Time Restored from NVS: %ld\n", saved);
  }
}

void initClock() {
  // Configure time with default timezone
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Try to load time from NVS immediately (in case we never get WiFi)
  loadTime();

  Serial.println("[CLOCK] Initialized internal RTC config");
}

bool syncNtp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 2000)) { // Wait up to 2s for sync
    Serial.println("[CLOCK] NTP Sync Failed");
    return false;
  }

  _timeSet = true;
  saveTime(); // Save good time immediately
  Serial.println("[CLOCK] NTP Sync Success");
  Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
  return true;
}

// getEpoch moved up

bool isTimeSet() {
  // Also check if year is valid (> 2020)
  time_t now = getEpoch();
  struct tm *t = localtime(&now);
  return _timeSet && (t->tm_year + 1900 > 2020);
}
} // namespace Sys
