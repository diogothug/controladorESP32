#pragma once
#include <stdint.h>
#include <stdio.h>
#include <vector>

// Mock Arduino definitions
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define INPUT_PULLDOWN 3
#define HIGH 1
#define LOW 0

// Mock State
extern uint32_t simulated_millis;
extern std::vector<int> pin_states;

// Functions
inline uint32_t millis() { return simulated_millis; }
inline void delay(uint32_t ms) { simulated_millis += ms; }
inline void pinMode(uint8_t pin, uint8_t mode) { 
    if (pin >= pin_states.size()) pin_states.resize(pin + 1, 0);
}
inline int digitalRead(uint8_t pin) {
    if (pin >= pin_states.size()) return 0;
    return pin_states[pin];
}
inline void Serial_printf(const char* fmt, ...) { } // logic only
class SerialMock {
public:
    void printf(const char* fmt, ...) {}
    void println(const char* str) {}
};
static SerialMock Serial;

// Pin Setter for Tests
inline void setPinState(uint8_t pin, int state) {
    if (pin >= pin_states.size()) pin_states.resize(pin + 1, 0);
    pin_states[pin] = state;
}
