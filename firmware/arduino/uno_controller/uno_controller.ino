#include "serial_parser.h"
#include "commands.h"

const long BAUD_RATE = 115200;

// Instantiate parser with the command handler function
SerialParser parser(executeCommand);

void setup() {
  Serial.begin(BAUD_RATE);
  while (!Serial) {
    ; // wait for serial port to connect
  }
}

void loop() {
  parser.check();
}

