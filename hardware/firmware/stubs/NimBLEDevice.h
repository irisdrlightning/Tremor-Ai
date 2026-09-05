#pragma once
#include <string>
#include <stdint.h>
#include <stddef.h>

namespace NIMBLE_PROPERTY {
  const uint32_t READ = 1;
  const uint32_t WRITE = 2;
  const uint32_t NOTIFY = 4;
}

class NimBLEConnInfo {};
class NimBLEServer;

class NimBLEServerCallbacks {
public:
  virtual ~NimBLEServerCallbacks() = default;
  virtual void onConnect(NimBLEServer* server, NimBLEConnInfo& connInfo) {}
  virtual void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo, int reason) {}
};

class NimBLECharacteristic;

class NimBLECharacteristicCallbacks {
public:
  virtual ~NimBLECharacteristicCallbacks() = default;
  virtual void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) {}
};

class NimBLECharacteristic {
public:
  void setCallbacks(NimBLECharacteristicCallbacks* pCallbacks) {}
  void setValue(const uint8_t* data, size_t size) {}
  void setValue(const uint8_t* data, int size) {}
  void notify() {}
  std::string getValue() { return ""; }
};

class NimBLEService {
public:
  NimBLECharacteristic* createCharacteristic(const char* uuid, uint32_t properties) { return nullptr; }
  void start() {}
};

class NimBLEAdvertising {
public:
  void addServiceUUID(const char* uuid) {}
  void setName(const char* name) {}
  void setScanResponse(bool set) {}
  void start() {}
};

class NimBLEAddress {
public:
  std::string toString() const { return "00:00:00:00:00:00"; }
};

class NimBLEServer {
public:
  void setCallbacks(NimBLEServerCallbacks* pCallbacks) {}
  NimBLEService* createService(const char* uuid) { return nullptr; }
};

class NimBLEDevice {
public:
  static void init(const std::string& deviceName) {}
  static void setPower(int power) {}
  static NimBLEServer* createServer() { return nullptr; }
  static NimBLEAdvertising* getAdvertising() { return nullptr; }
  static void startAdvertising() {}
  static NimBLEAddress getAddress() { return NimBLEAddress(); }
};
