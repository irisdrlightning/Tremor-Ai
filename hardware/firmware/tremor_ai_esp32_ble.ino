/*
 * ============================================================================
 * Tremor AI - ESP32 Dual Bluetooth Low Energy (BLE) & USB Serial Firmware
 * Target: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM
 * 
 * Features:
 *   1. Reads MPU6050 3-axis Accelerometer & 3-axis Gyroscope at 100 Hz (10 ms)
 *   2. Advertises as "TremorAi-RING-7842" over Bluetooth Low Energy
 *   3. BLE Service UUID:        4fafc201-1fb5-459e-8fcc-c5c9c331914b
 *   4. BLE Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8 (NOTIFY)
 *   5. Transmits 100 Hz CSV packets directly to Web Bluetooth (Chrome / Edge)
 *      AND mirrors stream over USB Serial at 115200 baud for universal compatibility!
 *
 * Wiring Diagram:
 *   MPU6050 VCC  --> ESP32 3.3V
 *   MPU6050 GND  --> ESP32 GND
 *   MPU6050 SCL  --> ESP32 GPIO 22 (I2C Clock)
 *   MPU6050 SDA  --> ESP32 GPIO 21 (I2C Data)
 *   MPU6050 AD0  --> GND (I2C address 0x68)
 *
 * Stream Format:
 *   timestamp_ms,ax,ay,az,gx,gy,gz
 * ============================================================================
 */

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// BLE Configuration
#define DEVICE_NAME         "TremorAi-RING-7842"
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// I2C & MPU6050 Configuration
#define MPU6050_ADDR 0x68
#define I2C_SDA 21
#define I2C_SCL 22
#define I2C_FREQ 400000 // 400 kHz Fast I2C
#define LED_PIN 2

const unsigned long SAMPLE_INTERVAL_US = 10000; // 100 Hz = 10,000 us
unsigned long lastSampleTimeUs = 0;

const float ACCEL_SCALE = 1.0f / 16384.0f; // +/- 2g
const float GYRO_SCALE  = 1.0f / 131.0f;   // +/- 250 deg/s

bool mpuConnected = false;

// BLE Server Callbacks
class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        digitalWrite(LED_PIN, HIGH);
        Serial.println(">> [BLE] Client connected! 100 Hz Web Bluetooth notifications active.");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        digitalWrite(LED_PIN, LOW);
        Serial.println(">> [BLE] Client disconnected. Restarting advertising...");
    }
};

void setup() {
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    Serial.begin(115200);
    delay(500);
    Serial.println("==================================================");
    Serial.println("  Tremor AI - ESP32 Bluetooth Low Energy (BLE)");
    Serial.println("  Broadcasting: " DEVICE_NAME);
    Serial.println("==================================================");

    // 1. Initialize I2C and MPU6050
    Wire.begin(I2C_SDA, I2C_SCL, I2C_FREQ);
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x6B); // PWR_MGMT_1
    Wire.write(0x00); // Wake up
    byte err = Wire.endTransmission();

    if (err == 0) {
        mpuConnected = true;
        // Accel +/- 2g
        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(0x1C);
        Wire.write(0x00);
        Wire.endTransmission();

        // Gyro +/- 250 deg/s
        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(0x1B);
        Wire.write(0x00);
        Wire.endTransmission();

        Serial.println("[MPU6050] Sensor calibrated and online at 0x68.");
    } else {
        Serial.printf("[MPU6050] Warning: Sensor not found (code %d). Retrying in loop.\n", err);
    }

    // 2. Initialize BLE Peripheral
    BLEDevice::init(DEVICE_NAME);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService* pService = pServer->createService(SERVICE_UUID);

    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ |
        BLECharacteristic::PROPERTY_NOTIFY
    );

    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06); // functions that help with iPhone connections issue
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("[BLE] Advertising started. Ready for Web Bluetooth pairing in browser!");
    lastSampleTimeUs = micros();
}

void loop() {
    // Reconnection handling
    if (!deviceConnected && oldDeviceConnected) {
        delay(500);
        pServer->startAdvertising();
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // MPU reconnect watchdog
    if (!mpuConnected) {
        static unsigned long lastCheck = 0;
        if (millis() - lastCheck > 1000) {
            lastCheck = millis();
            Wire.beginTransmission(MPU6050_ADDR);
            Wire.write(0x6B);
            Wire.write(0x00);
            if (Wire.endTransmission() == 0) {
                mpuConnected = true;
                Serial.println("[MPU6050] Sensor re-established!");
            }
        }
        return;
    }

    // 100 Hz Sampling Loop (every 10,000 microseconds)
    unsigned long currentUs = micros();
    if (currentUs - lastSampleTimeUs >= SAMPLE_INTERVAL_US) {
        lastSampleTimeUs += SAMPLE_INTERVAL_US;
        if (currentUs - lastSampleTimeUs > SAMPLE_INTERVAL_US) {
            lastSampleTimeUs = currentUs;
        }

        Wire.beginTransmission(MPU6050_ADDR);
        Wire.write(0x3B);
        Wire.endTransmission(false);
        Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);

        if (Wire.available() >= 14) {
            int16_t raw_ax = (Wire.read() << 8) | Wire.read();
            int16_t raw_ay = (Wire.read() << 8) | Wire.read();
            int16_t raw_az = (Wire.read() << 8) | Wire.read();
            int16_t raw_temp = (Wire.read() << 8) | Wire.read();
            int16_t raw_gx = (Wire.read() << 8) | Wire.read();
            int16_t raw_gy = (Wire.read() << 8) | Wire.read();
            int16_t raw_gz = (Wire.read() << 8) | Wire.read();

            float ax = raw_ax * ACCEL_SCALE;
            float ay = raw_ay * ACCEL_SCALE;
            float az = raw_az * ACCEL_SCALE;
            float gx = raw_gx * GYRO_SCALE;
            float gy = raw_gy * GYRO_SCALE;
            float gz = raw_gz * GYRO_SCALE;

            unsigned long ts = millis();

            // Format packet: timestamp_ms,ax,ay,az,gx,gy,gz
            char packet[64];
            snprintf(packet, sizeof(packet), "%lu,%.3f,%.3f,%.3f,%.1f,%.1f,%.1f",
                     ts, ax, ay, az, gx, gy, gz);

            // Mirror over Serial for USB connection
            Serial.println(packet);

            // Transmit over BLE notification to Web Bluetooth
            if (deviceConnected && pCharacteristic) {
                pCharacteristic->setValue((uint8_t*)packet, strlen(packet));
                pCharacteristic->notify();
            }
        }
    }
}
