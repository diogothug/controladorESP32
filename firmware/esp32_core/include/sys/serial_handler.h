#pragma once
#include <Arduino.h>

namespace Sys {

    class SerialHandler {
    public:
        static void init();
        static void update();

    private:
        static void processCommand(String cmd);
        
        // Command Handlers
        static void handleSys(String cmd);
        static void handleVar(String cmd);
        static void handleBoot(String cmd);
    };

}
