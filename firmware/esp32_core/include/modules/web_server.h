#pragma once
#include <Arduino.h>
#include <DNSServer.h>
#include <WebServer.h>

namespace Modules {

class WebServerModule {
public:
  static void init();
  static void update();

private:
  static WebServer server;
  static DNSServer dnsServer;

  static void setupRoutes();
  static void handleRoot();
  static void handleNotFound();

  // API Endpoints
  static void handleApiStatus();
  static void handleApiTide();

  static void handleApiConfig();
  static void handleApiFeedback();

  // Captive Portal
  static bool isCaptivePortal();
};

} // namespace Modules
