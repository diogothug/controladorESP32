#pragma once

// Product Identity
#define PRODUCT_NAME "TideDisplay_Pro"
#define FIRMWARE_VERSION "4.0.0"

// Hardware Config
#define LED_PIN 4
#define NUM_LEDS 64
#define PIN_TOUCH_SENSOR 15 // TTP223 Input

// System Config
#define SERIAL_BAUD 115200
#define WATCHDOG_TIMEOUT_SEC 5
#define CRASH_THRESHOLD 3

// Protection
#define MAX_SAFE_BRIGHTNESS 200 // Cap at ~80% for longevity

// Tide Configuration
#define TIDE_CACHE_DAYS 30
#define TIDE_UPDATE_THRESHOLD_DAYS 5
#define TIDE_CACHE_SIZE (TIDE_CACHE_DAYS * 4) // ~4 tides per day

// Default Port Chain (IDs or Enum equivalents)
#define PORT_CAIRU 101
#define PORT_VALENCA 102
#define PORT_CAMAMU 103
#define PORT_ARATU 104
#define PORT_SALVADOR 105

// Manufacturer Defaults
#define DEFAULT_TIDE_PORT_ID PORT_CAIRU
#define HAS_LDR 0 // Default: No LDR
#define LED_TYPE_STRIP 1

// WiFi Defaults
#define WIFI_DEFAULT_SSID "Moreré_Guest"
#define WIFI_DEFAULT_PASS "tide1234"

// Security
#define BT_PAIRING_PIN "1234"
#define WEB_DASHBOARD_PASS "admin"
