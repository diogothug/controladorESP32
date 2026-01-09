#include "commands.h"

void executeCommand(String cmd, String params) {
  // Handle Handshake
  if (cmd == "SYS") {
    if (params == "HELLO") {
      Serial.println("OK:DEVICE=ARDUINO_UNO;FW=1.0.0;CAPS=GPIO,ADC,PWM");
    } else {
      Serial.print("ERR:SYS_PARAM:");
      Serial.println(params);
    }
    return;
  }
  
  // Handle Optional Device Prefix stripping
  // If we receive UNO:PIN:13, we might want to recurse?
  // Or simpler: The App sends PIN:13 directly to the correct port.
  // We assume the latter as primary, but logic can check.
  if (cmd == "UNO") {
    // Split params again: PIN:13
    int firstColon = params.indexOf(':');
    if (firstColon != -1) {
       String subCmd = params.substring(0, firstColon);
       String subParams = params.substring(firstColon + 1);
       executeCommand(subCmd, subParams);
       return;
    }
  }

  // Handle PIN command
  if (cmd == "PIN") {
     // Format: PIN:13,HIGH
     int comma = params.indexOf(',');
     if (comma != -1) {
         int pin = params.substring(0, comma).toInt();
         String val = params.substring(comma+1);
         val.trim();
         
         pinMode(pin, OUTPUT);
         if (val == "HIGH" || val == "1") digitalWrite(pin, HIGH);
         else digitalWrite(pin, LOW);
         
         Serial.print("OK:PIN:");
         Serial.print(pin);
         Serial.print("=");
         Serial.println(val);
     } else {
        Serial.println("ERR:PIN_PARAM");
     }
     return;
  }

  // Handle READ command
  if (cmd == "READ") {
     // Format: READ:A0 or READ:13
     String p = params;
     p.trim();
     
     if (p.startsWith("A")) {
         // Analog read
         int channel = p.substring(1).toInt();
         // A0 is 14 on UNO, checking standard bounds
         if (channel >= 0 && channel <= 5) {
            int val = analogRead(A0 + channel);
            Serial.print("OK:READ:");
            Serial.print(p);
            Serial.print("=");
            Serial.println(val);
         } else {
            Serial.println("ERR:INVALID_AIN");
         }
     } else {
         // Digital read
         int pin = p.toInt();
         pinMode(pin, INPUT);
         int val = digitalRead(pin);
         Serial.print("OK:READ:");
         Serial.print(pin);
         Serial.print("=");
         Serial.println(val);
     }
     return;
  }

  // Default error
  Serial.print("ERR:UNKNOWN_CMD:");
  Serial.println(cmd);
}
