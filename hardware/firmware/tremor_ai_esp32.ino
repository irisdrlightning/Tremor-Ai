/*
 * ============================================================================
 * Tremor AI - ESP32 + MPU6050 BLE Telemetry Firmware
 * Target: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM
 *
 * Purpose:
 *   Continuous 100 Hz sampling of 3-axis accelerometer and 3-axis gyroscope
 *   data from an MPU6050 IMU sensor, streamed over Bluetooth Low Energy (BLE)
 *   using a custom GATT service so a browser can connect via the Web
 *   Bluetooth API (navigator.bluetooth) with NO backend/serial bridge needed.
 *
 * Wiring Diagram:
 *   MPU6050 VCC  --> ESP32 3.3V
 *   MPU6050 GND  --> ESP32 GND
 *   MPU6050 SCL  --> ESP32 GPIO 22 (Default I2C Clock)
 *   MPU6050 SDA  --> ESP32 GPIO 21 (Default I2C Data)
 *   MPU6050 AD0  --> GND (Sets I2C address to 0x68)
 *
 * BLE Design Notes:
 *   - Web Bluetooth cannot reliably sustain 100 individual notifications/sec
 *     (connection interval negotiation is out of the browser's control).
 *   - Instead, we sample the IMU at 100 Hz internally but BATCH 4 samples
 *     per BLE notification, sent every ~40ms (25 packets/sec). Same
 *     effective data rate, far fewer radio packets -> reliable throughput.
 *   - Packet format (binary, little-endian), sent on the Data characteristic:
 *       For each of 4 samples in the packet:
 *         uint32_t timestamp_ms
 *         float    ax, ay, az   (g)
 *         float    gx, gy, gz   (deg/s)
 *       => 4 bytes + 24 bytes = 28 bytes per sample x 4 samples = 112 bytes/packet
 *   - UUIDs below are placeholders generated for this project. They MUST
 *     match exactly what the frontend's src/config/ble.js expects. If you
 *     change one side, change the other.
 *
 * Library required (install via Arduino Library Manager):
 *   "NimBLE-Arduino" by h2zero
 *   (Lighter weight and more stable than the stock ESP32 BLE library.)
 * ============================================================================
 */

#include <Wire.h>
#include <NimBLEDevice.h>

// ---------------------------------------------------------------------------
// I2C / MPU6050 Configuration
// ---------------------------------------------------------------------------
#define MPU6050_ADDR 0x68
#define I2C_SDA 21
#define I2C_SCL 22
#define I2C_FREQ 400000 // 400 kHz Fast-Mode I2C

const unsigned long SAMPLE_INTERVAL_US = 10000; // 100 Hz = 10,000 us/sample
unsigned long lastSampleTimeUs = 0;

#define LED_PIN 2

const float ACCEL_SCALE = 1.0f / 16384.0f; // +/- 2g range
const float GYRO_SCALE  = 1.0f / 131.0f;   // +/- 250 deg/s range

bool mpuConnected = false;

// ---------------------------------------------------------------------------
// BLE Configuration — PLACEHOLDER UUIDs, must match frontend src/config/ble.js
// ---------------------------------------------------------------------------
#define DEVICE_NAME          "TremorAI-Glove"

#define SERVICE_UUID         "6f3c1200-1a2b-4c3d-9e8f-000000000001"
#define DATA_CHAR_UUID       "6f3c1200-1a2b-4c3d-9e8f-000000000002" // Notify: IMU data
#define COMMAND_CHAR_UUID    "6f3c1200-1a2b-4c3d-9e8f-000000000003" // Write: start/stop
#define BATTERY_CHAR_UUID    "6f3c1200-1a2b-4c3d-9e8f-000000000004" // Read/Notify: battery %

NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pDataChar = nullptr;
NimBLECharacteristic* pCommandChar = nullptr;
NimBLECharacteristic* pBatteryChar = nullptr;

bool deviceConnected = false;
bool streamingEnabled = true; // default ON; can be toggled via command characteristic

// ---------------------------------------------------------------------------
// Sample batching
// ---------------------------------------------------------------------------
#pragma pack(push, 1)
struct ImuSample {
  uint32_t timestamp_ms;
  float ax, ay, az;
  float gx, gy, gz;
};
#pragma pack(pop)

#define BATCH_SIZE 4
ImuSample sampleBatch[BATCH_SIZE];
uint8_t batchIndex = 0;

// ---------------------------------------------------------------------------
// BLE Server Callbacks
// ---------------------------------------------------------------------------
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& connInfo) override {
    deviceConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("# BLE client connected");
  }

  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& connInfo, int reason) override {
    deviceConnected = false;
    digitalWrite(LED_PIN, LOW);
    Serial.println("# BLE client disconnected, restarting advertising");
    NimBLEDevice::startAdvertising();
  }
};

// Command characteristic: browser writes a single byte
//   0x00 = stop streaming, 0x01 = start streaming
class CommandCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {
    std::string value = pChar->getValue();
    if (value.length() > 0) {
      streamingEnabled = (value[0] == 0x01);
      Serial.print("# Streaming command received: ");
      Serial.println(streamingEnabled ? "START" : "STOP");
    }
  }
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  while (!Serial && millis() < 2000) {
    delay(10);
  }

  Serial.println("# Tremor AI ESP32 MPU6050 BLE Telemetry Firmware v2.0");
  Serial.println("# Sampling: 100 Hz internal, batched 4-per-packet over BLE");

  initMpu6050();
  initBle();

  lastSampleTimeUs = micros();
}

void initMpu6050() {
  Wire.begin(I2C_SDA, I2C_SCL, I2C_FREQ);

  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // wake up
  byte error = Wire.endTransmission();

  if (error == 0) {
    mpuConnected = true;
    Serial.println("# MPU6050 initialized successfully on I2C address 0x68");

    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1C); Wire.write(0x00); Wire.endTransmission(); // Accel +/-2g

    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1B); Wire.write(0x00); Wire.endTransmission(); // Gyro +/-250deg/s

    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1A); Wire.write(0x03); Wire.endTransmission(); // DLPF 44Hz
  } else {
    mpuConnected = false;
    Serial.print("# ERROR: MPU6050 not detected (error code: ");
    Serial.print(error);
    Serial.println("). Please check wiring.");
  }
}

void initBle() {
  NimBLEDevice::init(DEVICE_NAME);
  // Optional: boost TX power for better range
  NimBLEDevice::setPower(ESP_PWR_LVL_P9);

  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService* pService = pServer->createService(SERVICE_UUID);

  pDataChar = pService->createCharacteristic(
      DATA_CHAR_UUID,
      NIMBLE_PROPERTY::NOTIFY
  );

  pCommandChar = pService->createCharacteristic(
      COMMAND_CHAR_UUID,
      NIMBLE_PROPERTY::WRITE
  );
  pCommandChar->setCallbacks(new CommandCallbacks());

  pBatteryChar = pService->createCharacteristic(
      BATTERY_CHAR_UUID,
      NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  uint8_t placeholderBattery = 100; // TODO: replace with real battery ADC read
  pBatteryChar->setValue(&placeholderBattery, 1);

  pService->start();

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setName(DEVICE_NAME);
  pAdvertising->start();

  Serial.println("# BLE advertising started as \"" DEVICE_NAME "\"");
  Serial.print("# Service UUID: "); Serial.println(SERVICE_UUID);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
void loop() {
  if (!mpuConnected) {
    static unsigned long lastRetryMs = 0;
    if (millis() - lastRetryMs > 1000) {
      lastRetryMs = millis();
      digitalWrite(LED_PIN, !digitalRead(LED_PIN));
      Wire.beginTransmission(MPU6050_ADDR);
      Wire.write(0x6B);
      Wire.write(0x00);
      if (Wire.endTransmission() == 0) {
        mpuConnected = true;
        Serial.println("# MPU6050 reconnected successfully!");
      }
    }
    return;
  }

  unsigned long currentUs = micros();
  if (currentUs - lastSampleTimeUs >= SAMPLE_INTERVAL_US) {
    lastSampleTimeUs += SAMPLE_INTERVAL_US;
    if (currentUs - lastSampleTimeUs > SAMPLE_INTERVAL_US) {
      lastSampleTimeUs = currentUs;
    }

    ImuSample sample;
    if (readMpuSample(sample)) {
      // Always print CSV to Serial too — useful for debugging over USB
      // even while BLE is the primary transport.
      Serial.print(sample.timestamp_ms); Serial.print(",");
      Serial.print(sample.ax, 4); Serial.print(",");
      Serial.print(sample.ay, 4); Serial.print(",");
      Serial.print(sample.az, 4); Serial.print(",");
      Serial.print(sample.gx, 2); Serial.print(",");
      Serial.print(sample.gy, 2); Serial.print(",");
      Serial.println(sample.gz, 2);

      if (deviceConnected && streamingEnabled) {
        sampleBatch[batchIndex] = sample;
        batchIndex++;

        if (batchIndex >= BATCH_SIZE) {
          pDataChar->setValue((uint8_t*)sampleBatch, sizeof(sampleBatch));
          pDataChar->notify();
          batchIndex = 0;
        }
      } else {
        batchIndex = 0; // drop partial batch if not connected/streaming
      }
    }
  }
}

bool readMpuSample(ImuSample &sample) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B); // ACCEL_XOUT_H
  Wire.endTransmission(false);

  Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);

  if (Wire.available() < 14) {
    return false;
  }

  int16_t raw_ax = (Wire.read() << 8) | Wire.read();
  int16_t raw_ay = (Wire.read() << 8) | Wire.read();
  int16_t raw_az = (Wire.read() << 8) | Wire.read();
  int16_t raw_temp = (Wire.read() << 8) | Wire.read(); // ignored
  int16_t raw_gx = (Wire.read() << 8) | Wire.read();
  int16_t raw_gy = (Wire.read() << 8) | Wire.read();
  int16_t raw_gz = (Wire.read() << 8) | Wire.read();

  sample.timestamp_ms = millis();
  sample.ax = raw_ax * ACCEL_SCALE;
  sample.ay = raw_ay * ACCEL_SCALE;
  sample.az = raw_az * ACCEL_SCALE;
  sample.gx = raw_gx * GYRO_SCALE;
  sample.gy = raw_gy * GYRO_SCALE;
  sample.gz = raw_gz * GYRO_SCALE;

  return true;
}