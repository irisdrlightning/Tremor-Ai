#pragma once
#include <stdint.h>
#include <stddef.h>

#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT 0

#define ESP_PWR_LVL_P9 9

typedef uint8_t byte;

inline void pinMode(uint8_t, uint8_t) {}
inline void digitalWrite(uint8_t, uint8_t) {}
inline int digitalRead(uint8_t) { return 0; }
inline unsigned long millis() { return 0; }
inline unsigned long micros() { return 0; }
inline void delay(unsigned long) {}

class HardwareSerial {
public:
  void begin(unsigned long) {}
  template <typename T> void print(const T&, int = 0) {}
  void print(const char*) {}
  template <typename T> void println(const T&) {}
  void println(const char* = "") {}
  void println() {}
  operator bool() { return true; }
};

extern HardwareSerial Serial;

class TwoWire {
public:
  void begin(int sda = -1, int scl = -1, uint32_t freq = 0) {}
  void beginTransmission(uint8_t address) {}
  void beginTransmission(int address) {}
  size_t write(uint8_t data) { return 1; }
  size_t write(int data) { return 1; }
  uint8_t endTransmission(bool sendStop = true) { return 0; }
  uint8_t requestFrom(uint8_t address, uint8_t quantity, uint8_t sendStop = true) { return quantity; }
  int available() { return 14; }
  int read() { return 0; }
};

extern TwoWire Wire;
