/*
 * ============================================================================
 * Tremor AI - ESP32 + MPU6050 High-Speed Telemetry Firmware
 * Target: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM
 * 
 * Purpose:
 *   Continuous 100 Hz sampling of 3-axis accelerometer and 3-axis gyroscope
 *   data from an MPU6050 IMU sensor. Formatted as CSV and streamed over USB Serial
 *   to feed the Tremor AI real-time digital signal processing (FFT) and 
 *   Parkinsonian tremor classification pipeline.
 *
 * Wiring Diagram:
 *   MPU6050 VCC  --> ESP32 3.3V
 *   MPU6050 GND  --> ESP32 GND
 *   MPU6050 SCL  --> ESP32 GPIO 22 (Default I2C Clock)
 *   MPU6050 SDA  --> ESP32 GPIO 21 (Default I2C Data)
 *   MPU6050 AD0  --> GND (Sets I2C address to 0x68)
 *
 * Output Stream Format (115200 baud, ~100 lines/sec):
 *   timestamp_ms,ax,ay,az,gx,gy,gz
 *   Units: ax,ay,az in g (standard gravity); gx,gy,gz in deg/s (degrees per sec)
 *
 * Note: Uses direct Wire.h register reads for zero-dependency universal flashing.
 * ============================================================================
 */

#include <Wire.h>

// I2C Configuration
#define MPU6050_ADDR 0x68
#define I2C_SDA 21
#define I2C_SCL 22
#define I2C_FREQ 400000 // 400 kHz Fast-Mode I2C

// Sampling Timing: 100 Hz = 10,000 microseconds per sample
const unsigned long SAMPLE_INTERVAL_US = 10000;
unsigned long lastSampleTimeUs = 0;

// LED Status indicator (GPIO 2 on most ESP32 dev boards)
#define LED_PIN 2

// Sensitivity scale factors for default settings:
// Accel: +/- 2g range -> 16384 LSB/g
// Gyro:  +/- 250 deg/s -> 131.0 LSB/(deg/s)
const float ACCEL_SCALE = 1.0f / 16384.0f;
const float GYRO_SCALE  = 1.0f / 131.0f;

bool mpuConnected = false;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize Serial
  Serial.begin(115200);
  while (!Serial && millis() < 2000) {
    delay(10);
  }

  Serial.println("# Tremor AI ESP32 MPU6050 Telemetry Firmware v1.0");
  Serial.println("# Target sampling rate: 100 Hz");

  // Initialize I2C
  Wire.begin(I2C_SDA, I2C_SCL, I2C_FREQ);

  // Wake up MPU6050 by writing 0 to PWR_MGMT_1 (Register 0x6B)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  byte error = Wire.endTransmission();

  if (error == 0) {
    mpuConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("# MPU6050 initialized successfully on I2C address 0x68");
    
    // Configure Accel +/- 2g: Register 0x1C (ACCEL_CONFIG) -> 0x00
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1C);
    Wire.write(0x00);
    Wire.endTransmission();

    // Configure Gyro +/- 250 deg/s: Register 0x1B (GYRO_CONFIG) -> 0x00
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1B);
    Wire.write(0x00);
    Wire.endTransmission();

    // Configure DLPF (Digital Low Pass Filter) to 44 Hz: Register 0x1A -> 0x03
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x1A);
    Wire.write(0x03);
    Wire.endTransmission();

    Serial.println("# Streaming CSV format: timestamp_ms,ax,ay,az,gx,gy,gz");
  } else {
    mpuConnected = false;
    Serial.print("# ERROR: MPU6050 not detected on I2C address 0x68 (error code: ");
    Serial.print(error);
    Serial.println("). Please check wiring.");
  }

  lastSampleTimeUs = micros();
}

void loop() {
  if (!mpuConnected) {
    // Retry initialization every 1 second if disconnected
    static unsigned long lastRetryMs = 0;
    if (millis() - lastRetryMs > 1000) {
      lastRetryMs = millis();
      digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Flash LED on error
      Wire.beginTransmission(MPU6050_ADDR);
      Wire.write(0x6B);
      Wire.write(0x00);
      if (Wire.endTransmission() == 0) {
        mpuConnected = true;
        digitalWrite(LED_PIN, HIGH);
        Serial.println("# MPU6050 reconnected successfully!");
      }
    }
    return;
  }

  unsigned long currentUs = micros();
  // Check if 10,000 microseconds (10 ms) have passed for 100 Hz sampling
  if (currentUs - lastSampleTimeUs >= SAMPLE_INTERVAL_US) {
    lastSampleTimeUs += SAMPLE_INTERVAL_US;
    // Guard against timer rollover / lag
    if (currentUs - lastSampleTimeUs > SAMPLE_INTERVAL_US) {
      lastSampleTimeUs = currentUs;
    }

    // Request 14 bytes starting from register 0x3B (ACCEL_XOUT_H)
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    
    Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14, (uint8_t)true);
    
    if (Wire.available() >= 14) {
      int16_t raw_ax = (Wire.read() << 8) | Wire.read();
      int16_t raw_ay = (Wire.read() << 8) | Wire.read();
      int16_t raw_az = (Wire.read() << 8) | Wire.read();
      int16_t raw_temp = (Wire.read() << 8) | Wire.read(); // temperature (ignored)
      int16_t raw_gx = (Wire.read() << 8) | Wire.read();
      int16_t raw_gy = (Wire.read() << 8) | Wire.read();
      int16_t raw_gz = (Wire.read() << 8) | Wire.read();

      // Convert to physical units (g and deg/s)
      float ax = raw_ax * ACCEL_SCALE;
      float ay = raw_ay * ACCEL_SCALE;
      float az = raw_az * ACCEL_SCALE;
      float gx = raw_gx * GYRO_SCALE;
      float gy = raw_gy * GYRO_SCALE;
      float gz = raw_gz * GYRO_SCALE;

      unsigned long timestamp_ms = millis();

      // Output CSV line: timestamp_ms,ax,ay,az,gx,gy,gz
      Serial.print(timestamp_ms);
      Serial.print(",");
      Serial.print(ax, 4);
      Serial.print(",");
      Serial.print(ay, 4);
      Serial.print(",");
      Serial.print(az, 4);
      Serial.print(",");
      Serial.print(gx, 2);
      Serial.print(",");
      Serial.print(gy, 2);
      Serial.print(",");
      Serial.println(gz, 2);
    }
  }
}
