#include "serial_parser.h"

SerialParser::SerialParser(CommandHandler handler) {
  _handler = handler;
  _index = 0;
  memset(_buffer, 0, 64);
}

void SerialParser::check() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    // Check for buffer overflow
    if (_index >= 63) {
      // Overflow: reset buffer and potentially log error
      // Ideally we should wait for newline to sync back up
      _index = 0;
      // We could send ERR:OVERFLOW here
    }

    if (c == '\n') {
      _buffer[_index] = '\0'; // Null-terminate
      processCommand();
      _index = 0; // Reset for next command
    } else if (c != '\r') {
      // Add to buffer if not carriage return
      _buffer[_index++] = c;
    }
  }
}

void SerialParser::processCommand() {
  // Expected format: COMMAND:PARAMS
  // Example: PIN:13,HIGH or SYS:HELLO
  
  String raw = String(_buffer);
  
  // Find first colon
  int firstColon = raw.indexOf(':');
  
  if (firstColon == -1) {
    // No colon found, invalid format or just a command without params?
    // User spec: <DEVICE>:<COMMAND>:<PARAMS>\n or <COMMAND>:<PARAMS>\n
    // Let's assume COMMAND:PARAMS logic.
    // As per user spec 5 (optional prefix): PIN:13,HIGH
    // So split by first colon.
    
    // If no colon, maybe it's a command without params? e.g. "PING"
    if (raw.length() > 0) {
        _handler(raw, "");
    }
    return;
  }
  
  String cmd = raw.substring(0, firstColon);
  String params = raw.substring(firstColon + 1);
  
  // Also handle DEVICE:COMMAND:PARAMS if present?
  // If user sends UNO:PIN:13,HIGH vs PIN:13,HIGH
  // The firmware should probably handle both or be agnostic.
  // If we split by ':' again?
  
  // Check if cmd is a known device descriptor (UNO, ESP)
  // Simple heuristic: if 'params' has a colon, maybe the first part was device.
  // Example: UNO:PIN:13
  // cmd="UNO", params="PIN:13"
  // We can recursively strip?
  
  // For now, let's just pass cmd and params to handler.
  _handler(cmd, params);
}
