#pragma once
#include <Arduino.h>
#include <WebServer.h>
#include <DNSServer.h>

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
        
        // Captive Portal
        static bool isCaptivePortal();
    };

}
