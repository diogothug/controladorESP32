#include "modules/tide_engine.h"
#include "config.h"
#include "modules/recovery.h"
#include "sys/clock.h"
#include <LittleFS.h>
#include <math.h>
#include <vector>


namespace Modules {

float TideEngine::currentLevel = 0.5f;
bool TideEngine::rising = true;
std::vector<TideExtrema> TideEngine::cache;
bool TideEngine::needsFetch = false;

// File path for cache
const char *CACHE_FILE = "/tide.bin";

void TideEngine::init() {
  Serial.println("[TIDE] Engine Initialized");

  // Try to load cache first
  if (!loadCache()) {
    Serial.println("[TIDE] Cache empty or invalid. Using Safe Defaults.");
    fetchMockData(); // Initially populate with safe defaults/smart fallback
  }

  // Check data availability
  ensureDataAvailable();

  update();
}

void TideEngine::update() {
  if (!Sys::isTimeSet()) {
    return;
  }

  time_t now = Sys::getEpoch();

  // 1. Try to find tide from cache (Golden Source)
  // Find interval [t1, t2] surrounding 'now'
  TideExtrema *prev = nullptr;
  TideExtrema *next = nullptr;

  for (auto &entry : cache) {
    if (entry.timestamp <= now) {
      prev = &entry;
    } else {
      next = &entry;
      break; // Found the window
    }
  }

  if (prev && next) {
    // Interpolate using cosine harmonic (Smooth S-curve)
    float t_total = (float)(next->timestamp - prev->timestamp);
    float t_elapsed = (float)(now - prev->timestamp);
    float progress = t_elapsed / t_total;

    // Cosine interpolation: (1 - cos(pi * progress)) / 2
    // Rising: 0->1, Falling: 1->0
    float harmonic = (1.0f - cos(progress * PI)) / 2.0f;

    if (prev->level < next->level) {
      // Rising
      currentLevel = prev->level + (next->level - prev->level) * harmonic;
      rising = true;
    } else {
      // Falling
      currentLevel =
          prev->level + (next->level - prev->level) *
                            harmonic; // prev > next, so this subtracts
      rising = false;
    }
  } else {
    // 2. Fallback to M2 Constituent Calculation (Approximation)
    double hours = (double)now / 3600.0;
    double theta = (hours * M2_SPEED) - M2_PHASE;
    double rads = theta * PI / 180.0;
    double val = cos(rads);
    currentLevel = (val + 1.0) / 2.0;
    rising = (-sin(rads)) > 0;
  }
}

bool TideEngine::loadCache() {
  if (!LittleFS.exists(CACHE_FILE))
    return false;

  File file = LittleFS.open(CACHE_FILE, "r");
  if (!file) {
    Serial.println("[TIDE] Failed to open cache file");
    return false;
  }

  size_t len = file.size();
  if (len == 0 || len % sizeof(TideExtrema) != 0) {
    file.close();
    return false;
  }

  size_t count = len / sizeof(TideExtrema);
  cache.clear();
  cache.resize(count);
  file.read((uint8_t *)cache.data(), len);
  file.close();

  Serial.printf("[TIDE] Loaded %d events from LittleFS\n", count);
  return true;
}

void TideEngine::saveCache() {
  if (cache.empty())
    return;

  File file = LittleFS.open(CACHE_FILE, "w");
  if (!file) {
    Serial.println("[TIDE] Failed to write cache file");
    return;
  }

  file.write((uint8_t *)cache.data(), cache.size() * sizeof(TideExtrema));
  file.close();

  Serial.println("[TIDE] Cache saved to LittleFS");
}

bool TideEngine::ensureDataAvailable() {
  if (!Sys::isTimeSet())
    return false;

  time_t now = Sys::getEpoch();

  // Find the last timestamp in cache
  time_t lastDataPoint = 0;
  if (!cache.empty()) {
    lastDataPoint = cache.back().timestamp;
  }

  // Calculate remaining duration coverage
  double daysRemaining = (double)(lastDataPoint - now) / 86400.0;

  if (daysRemaining < TIDE_UPDATE_THRESHOLD_DAYS) {
    Serial.printf(
        "[TIDE] Low Cache (%.1f days remaining). Requesting Update...\n",
        daysRemaining);
    needsFetch = true;

    // For simulation logic (Mock Fetch)
    if (cache.empty())
      fetchMockData();
    return false;
  }

  return true;
}

void TideEngine::fetchMockData() {
  // Smart Default Chain Logic:
  // Priority: Cairu > Valença > Camamu > Aratu > Salvador
  // Simulating the "Best Available" selection logic
  int selectedPort = PORT_CAIRU; // Defaulting to Cairu (Moreré equivalent)
  int timeOffsetMinutes = 5;     // Cairu offset +5 min

  // Apply logic based on available configuration (if any)
  // ... (This would be strictly based on user config availability)

  Serial.printf("[TIDE] Using Smart Default Port: %d (Offset: %d min)\n",
                selectedPort, timeOffsetMinutes);

  // Generate synthetic data for 30 days starting now
  time_t start = Sys::isTimeSet() ? Sys::getEpoch() : 0;
  cache.clear();

  for (int i = 0; i < (TIDE_CACHE_DAYS + 2) * 4;
       i++) { // Slightly more than needed
    // Generate ~6h cycle
    TideExtrema ev;
    ev.timestamp = start + (i * (6 * 3600 + (12 * 60))); // ~6h 12m cycle
    ev.timestamp += (timeOffsetMinutes * 60);            // Apply offset

    ev.type = (i % 2 == 0) ? 0 : 1;          // Alternating Low/High
    ev.level = (ev.type == 0) ? 0.2f : 1.8f; // 0.2m Low, 1.8m High

    cache.push_back(ev);
  }

  saveCache();
}

float TideEngine::getTideLevel() { return currentLevel; }

bool TideEngine::isRising() { return rising; }

} // namespace Modules
