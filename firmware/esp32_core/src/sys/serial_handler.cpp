#include "sys/serial_handler.h"
#include "config.h"
#include "modules/led_manager.h"
#include "modules/recovery.h"
#include "modules/touch_manager.h"
#include "modules/wifi_manager.h"
#include "sys/clock.h"
#include "sys/state.h"


namespace Sys {

void SerialHandler::init() {
  // Serial is already started in main.cpp, but we can do any extra setup here
}

void SerialHandler::handleVar(String cmd) {
  // VAR:SET:KEY:VALUE (Basic Stub for now)
  if (cmd.startsWith("VAR:SET:")) {
    Serial.println("OK:VAR:SET:STUB");
  }
}

// Touch Calibration State
static bool isCalibratingTouch = false;
static unsigned long lastCalibReport = 0;

void SerialHandler::processCommand(String cmd) {
  if (cmd.startsWith("SYS:")) {
    handleSys(cmd);
  } else if (cmd.startsWith("VAR:")) {
    handleVar(cmd);
  } else if (cmd.startsWith("BOOT:")) {
    handleBoot(cmd);
  } else if (cmd.startsWith("TOUCH:")) {
    // TOUCH:MODE:DIGITAL, TOUCH:MODE:NATIVE
    // TOUCH:SET_THRESH:30
    // TOUCH:CALIBRATE:START, TOUCH:CALIBRATE:STOP

    if (cmd == "TOUCH:CALIBRATE:START") {
      isCalibratingTouch = true;
      Serial.println("OK:TOUCH:CALIBRATE:START");
    } else if (cmd == "TOUCH:CALIBRATE:STOP") {
      isCalibratingTouch = false;
      Serial.println("OK:TOUCH:CALIBRATE:STOP");
    } else if (cmd.startsWith("TOUCH:MODE:")) {
      String mode = cmd.substring(11); // TOUCH:MODE:Len=11
      if (mode == "DIGITAL")
        Modules::TouchManager::setMode(Modules::TouchManager::MODE_DIGITAL);
      else if (mode == "NATIVE")
        Modules::TouchManager::setMode(Modules::TouchManager::MODE_NATIVE);
      Serial.println("OK:TOUCH:MODE");
    } else if (cmd.startsWith("TOUCH:SET_THRESH:")) {
      int val = cmd.substring(17).toInt(); // TOUCH:SET_THRESH:Len=17
      Modules::TouchManager::setThreshold(val);
      Serial.printf("OK:TOUCH:SET_THRESH:%d\n", val);
    }
  } else {
    Serial.println("ERR:UNKNOWN_CMD");
  }
}

void SerialHandler::update() {
  // Calibration Loop
  if (isCalibratingTouch && (millis() - lastCalibReport > 100)) {
    // Report RAW value @ 10Hz
    Serial.printf("TOUCH:RAW:%d\n", Modules::TouchManager::getLastRawReading());
    lastCalibReport = millis();
  }

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      processCommand(cmd);
    }
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
    if (cmd.endsWith("NORMAL"))
      setBootMode(BootMode::NORMAL);
    else if (cmd.endsWith("SAFE"))
      setBootMode(BootMode::SAFE_MODE);
    Serial.println("OK:BOOT:SET");
    return;
  }
}

void SerialHandler::handleSys(String cmd) {
  if (cmd == "SYS:PING") {
    Serial.println("OK:SYS:PONG");
  } else if (cmd == "SYS:RESET") {
    Serial.println("OK:SYS:RESETTING");
    ESP.restart();
  } else if (cmd == "SYS:SAFE_MODE?") {
    Serial.printf("OK:SAFE_MODE:%d\n",
                  Modules::RecoveryManager::isSafeMode() ? 1 : 0);
  } else if (cmd == "SYS:CRASH_LOG?") {
    Serial.printf("OK:CRASH_LOG:%s\n",
                  Modules::RecoveryManager::getLastCrashReason().c_str());
  } else if (cmd.startsWith("SYS:WDT:SET:")) {
    // SYS:WDT:SET:<ID>:<MS>
    // Assuming ID is single digit for simplicity or we parse properly
    int firstColon = 11; // Length of "SYS:WDT:SET:"
    int secondColon = cmd.indexOf(':', firstColon);
    if (secondColon > 0) {
      int id = cmd.substring(firstColon, secondColon).toInt();
      int ms = cmd.substring(secondColon + 1).toInt();
      Modules::RecoveryManager::setThreshold((Modules::SubsystemID)id, ms);
      Serial.println("OK:SYS:WDT:SET");
    } else {
      Serial.println("ERR:SYS:ARGS");
    }
  } else {
    Serial.println("ERR:SYS:UNKNOWN");
  }
}

} // namespace Sys
