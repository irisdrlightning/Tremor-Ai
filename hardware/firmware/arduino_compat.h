#pragma once

#if __has_include(<Arduino.h>)
  #include <Arduino.h>
  #include <stdint.h>
  #include <string.h>
  #include <Wire.h>
  #include <Preferences.h>
#else
  // Desktop IDE language server compatibility shim
  #include <stdint.h>
  #include <string.h>
  #include <stdio.h>
  #include <stdlib.h>
  #include <math.h>

  #define HIGH 1
  #define LOW 0
  #define OUTPUT 1
  #define INPUT 0
  #define DEC 10
  #define HEX 16

  inline void pinMode(int pin, int mode) {}
  inline void digitalWrite(int pin, int val) {}
  inline void delay(unsigned long ms) {}
  inline unsigned long millis() { return 0; }
  inline unsigned long micros() { return 0; }

  class String {
  public:
    String() {}
    String(const char*) {}
    int indexOf(...) const { return -1; }
    int length() const { return 0; }
    String substring(...) const { return ""; }
    int toInt() const { return 0; }
    bool startsWith(...) const { return false; }
    const char* c_str() const { return ""; }
  };

  class SerialMock {
  public:
    void begin(unsigned long baud) {}
    void print(...) {}
    void println(...) {}
    void printf(...) {}
    int available() { return 0; }
    char read() { return 0; }
    bool find(...) { return false; }
    String readStringUntil(...) { return ""; }
  };
  static SerialMock Serial;

  class WireMock {
  public:
    void begin(...) {}
    void setClock(...) {}
    void beginTransmission(...) {}
    void write(...) {}
    int endTransmission(...) { return 0; }
    int requestFrom(...) { return 0; }
    int read() { return 0; }
    int available() { return 0; }
  };
  static WireMock Wire;

  class Preferences {
  public:
    bool begin(...) { return true; }
    void end() {}
    void clear() {}
    uint8_t getUChar(...) { return 0; }
    size_t putUChar(...) { return 0; }
    size_t getBytes(...) { return 0; }
    size_t putBytes(...) { return 0; }
  };

  class NimBLECharacteristic {
  public:
    void setValue(...) {}
    void notify(...) {}
    void setCallbacks(...) {}
  };

  class NimBLEServer {
  public:
    void setCallbacks(...) {}
    class NimBLEService* createService(...) { return nullptr; }
    class NimBLEAdvertising* getAdvertising(...) { return nullptr; }
  };

  class NimBLEService {
  public:
    NimBLECharacteristic* createCharacteristic(...) { return nullptr; }
    void start() {}
  };

  class NimBLEAdvertising {
  public:
    void addServiceUUID(...) {}
    void setScanResponse(...) {}
    void start() {}
  };

  class NimBLEDevice {
  public:
    static void init(...) {}
    static void setMTU(...) {}
    static NimBLEServer* createServer() { return nullptr; }
    static NimBLEAdvertising* getAdvertising() { return nullptr; }
  };

  class NimBLEServerCallbacks {};
  class NimBLECharacteristicCallbacks {};
  #define NIMBLE_PROPERTY class NimBLEProperty
  class NimBLEProperty {
  public:
    static const int NOTIFY = 1;
    static const int READ = 2;
    static const int WRITE = 4;
    static const int WRITE_NR = 8;
  };
#endif
