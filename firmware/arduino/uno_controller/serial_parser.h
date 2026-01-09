#ifndef SERIAL_PARSER_H
#define SERIAL_PARSER_H

#include <Arduino.h>

// Callback type for when a valid command is received
// command: The command string (e.g. "PIN", "SYS")
// params: The parameters string (e.g. "13,HIGH")
typedef void (*CommandHandler)(String command, String params);

class SerialParser {
  private:
    char _buffer[64];
    int _index;
    CommandHandler _handler;
    
    void processCommand();

  public:
    SerialParser(CommandHandler handler);
    void check();
};

#endif
