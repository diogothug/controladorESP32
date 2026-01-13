#include "sys/serial_handler.h"
#include "config.h"
#include "sys/state.h"
#include "sys/clock.h"
#include "modules/led_manager.h"
#include "modules/wifi_manager.h"

namespace Sys {

    void SerialHandler::init() {
        // Serial is already started in main.cpp, but we can do any extra setup here
    }

    void SerialHandler::update() {
        if (Serial.available()) {
            String cmd = Serial.readStringUntil('\n');
            cmd.trim();
            if (cmd.length() > 0) {
                processCommand(cmd);
            }
        }
    }

    void SerialHandler::processCommand(String cmd) {
        if (cmd.startsWith("SYS:")) {
            handleSys(cmd);
        } else if (cmd.startsWith("VAR:")) {
            handleVar(cmd);
        } else if (cmd.startsWith("BOOT:")) {
            handleBoot(cmd);
        } else {
            Serial.println("ERR:UNKNOWN_CMD");
        }
    }

    void SerialHandler::handleSys(String cmd) {
        if (cmd == "SYS:HELLO") {
            Serial.printf("SYS:HELLO:%s\n", PRODUCT_NAME);
            Serial.printf("OK:DEVICE=%s;FW=%s;CAPS=LED,WIFI,TIDE\n", PRODUCT_NAME, FIRMWARE_VERSION);
            return;
        }
        if (cmd == "SYS:RESET") {
            Serial.println("OK:SYS:RESET");
            delay(100);
            ESP.restart();
            return;
        }
        if (cmd == "SYS:INFO") {
            Serial.printf("OK:SYS:INFO:HEAP=%d;TIME=%ld\n", ESP.getFreeHeap(), getEpoch());
            return;
        }
    }

    void SerialHandler::handleVar(String cmd) {
        // VAR:SET:KEY:VALUE (Basic Stub for now)
        if (cmd.startsWith("VAR:SET:")) {
            Serial.println("OK:VAR:SET:STUB");
        }
    }

    void SerialHandler::handleBoot(String cmd) {
        if (cmd == "BOOT:GET") {
            int mode = (int)getState().bootMode;
            Serial.printf("OK:BOOT:%d\n", mode);
            return;
        }
        if (cmd.startsWith("BOOT:SET:")) {
            // Very basic parser: BOOT:SET:NORMAL -> 0, SAFE -> 1
            if (cmd.endsWith("NORMAL")) setBootMode(BootMode::NORMAL);
            else if (cmd.endsWith("SAFE")) setBootMode(BootMode::SAFE_MODE);
            Serial.println("OK:BOOT:SET");
            return;
        }
    }

}
