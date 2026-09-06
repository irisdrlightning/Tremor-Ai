/*
 * ============================================================================
 * Tremor AI - ESP32 + MPU6050 High-Speed Telemetry & On-Device Storage Firmware
 * Target: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM / Wearable Ring & Glove
 *
 * Purpose:
 *   1. Continuous 100 Hz sampling of 3-axis accelerometer and 3-axis gyroscope
 *      streamed over USB Serial to feed real-time DSP (FFT) & AI classification.
 *   2. Non-Volatile Flash Memory Storage (NVS Preferences.h):
 *      - Stores up to 30 patient medication doses logged on the dashboard.
 *      - Stores multi-day offline tremor telemetry records.
 *   3. Bi-directional Command Protocol:
 *      - Host -> Ring: "CMD:LOG_DOSE,<timestamp_unix>,<name>,<levo>,<carbi>,<state>"
 *      - Host -> Ring: "CMD:SYNC_HISTORY" (triggers # SYNC_DOSE and # SYNC_DAY output)
 *      - Host -> Ring: "CMD:CLEAR_DOSES"
 *
 * Wiring Diagram:
 *   MPU6050 VCC  --> ESP32 3.3V
 *   MPU6050 GND  --> ESP32 GND
 *   MPU6050 SCL  --> ESP32 GPIO 22 (Default I2C Clock)
 *   MPU6050 SDA  --> ESP32 GPIO 21 (Default I2C Data)
 *   MPU6050 AD0  --> GND (Sets I2C address to 0x68)
 *
 * Output Stream Format (115200 baud):
 *   timestamp_ms,ax,ay,az,gx,gy,gz
 * ============================================================================
 */

#include "arduino_compat.h"

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

const float ACCEL_SCALE = 1.0f / 16384.0f; // +/- 2g range
const float GYRO_SCALE = 1.0f / 131.0f;    // +/- 250 deg/s range

bool mpuConnected = false;

// ---------------------------------------------------------------------------
// On-Device Flash Memory Storage (Preferences.h)
// ---------------------------------------------------------------------------
Preferences prefs;
#define MAX_STORED_DOSES 30

#pragma pack(push, 1)
struct StoredDoseRecord {
  uint32_t timestamp_unix;
  char medication_name[32];
  uint16_t levodopa_mg;
  uint16_t carbidopa_mg;
  char motor_state[16]; // "on-state", "wearing-off", "off-state"
};
#pragma pack(pop)

StoredDoseRecord storedDoses[MAX_STORED_DOSES];
uint8_t loggedDosesCount = 0;

void loadStoredDoses() {
  prefs.begin("tremor_doses", false);
  loggedDosesCount = prefs.getUChar("count", 0);
  if (loggedDosesCount > MAX_STORED_DOSES) loggedDosesCount = MAX_STORED_DOSES;
  
  if (loggedDosesCount > 0) {
    prefs.getBytes("doses", storedDoses, sizeof(StoredDoseRecord) * loggedDosesCount);
    Serial.print("# Loaded "); Serial.print(loggedDosesCount);
    Serial.println(" stored medication doses from Ring Flash memory.");
  } else {
    Serial.println("# No offline medication doses stored in Ring yet.");
  }
  prefs.end();
}

void saveStoredDoses() {
  prefs.begin("tremor_doses", false);
  prefs.putUChar("count", loggedDosesCount);
  prefs.putBytes("doses", storedDoses, sizeof(StoredDoseRecord) * loggedDosesCount);
  prefs.end();
}

void addStoredDose(uint32_t ts, const char* medName, uint16_t levodopa, uint16_t carbidopa, const char* motorState) {
  if (loggedDosesCount >= MAX_STORED_DOSES) {
    for (int i = 0; i < MAX_STORED_DOSES - 1; i++) {
      storedDoses[i] = storedDoses[i + 1];
    }
    loggedDosesCount = MAX_STORED_DOSES - 1;
  }

  StoredDoseRecord& d = storedDoses[loggedDosesCount];
  d.timestamp_unix = ts;
  strncpy(d.medication_name, medName, sizeof(d.medication_name) - 1);
  d.medication_name[sizeof(d.medication_name) - 1] = '\0';
  d.levodopa_mg = levodopa;
  d.carbidopa_mg = carbidopa;
  strncpy(d.motor_state, motorState, sizeof(d.motor_state) - 1);
  d.motor_state[sizeof(d.motor_state) - 1] = '\0';

  loggedDosesCount++;
  saveStoredDoses();

  Serial.print("# SUCCESS: Stored dose on Ring Flash: ");
  Serial.print(d.medication_name);
  Serial.print(" ("); Serial.print(d.levodopa_mg); Serial.print("/"); Serial.print(d.carbidopa_mg);
  Serial.print(" mg) State: "); Serial.println(d.motor_state);
}

void syncStoredDosesToHost() {
  Serial.println("# --- BEGIN STORED DOSES SYNC ---");
  for (int i = 0; i < loggedDosesCount; i++) {
    Serial.print("# SYNC_DOSE,");
    Serial.print(storedDoses[i].timestamp_unix); Serial.print(",");
    Serial.print(storedDoses[i].medication_name); Serial.print(",");
    Serial.print(storedDoses[i].levodopa_mg); Serial.print(",");
    Serial.print(storedDoses[i].carbidopa_mg); Serial.print(",");
    Serial.println(storedDoses[i].motor_state);
  }
  Serial.println("# --- END STORED DOSES SYNC ---");
}

void clearStoredDoses() {
  prefs.begin("tremor_doses", false);
  prefs.clear();
  loggedDosesCount = 0;
  prefs.end();
  Serial.println("# Ring medication doses storage cleared.");
}

void parseAndSaveDoseCommand(const String& cmdStr) {
  int firstComma = cmdStr.indexOf(',');
  if (firstComma == -1) return;

  String rest = cmdStr.substring(firstComma + 1);
  int c1 = rest.indexOf(',');
  int c2 = (c1 != -1) ? rest.indexOf(',', c1 + 1) : -1;
  int c3 = (c2 != -1) ? rest.indexOf(',', c2 + 1) : -1;
  int c4 = (c3 != -1) ? rest.indexOf(',', c3 + 1) : -1;

  if (c1 != -1 && c2 != -1 && c3 != -1 && c4 != -1) {
    uint32_t ts = rest.substring(0, c1).toInt();
    String medName = rest.substring(c1 + 1, c2);
    uint16_t levo = rest.substring(c2 + 1, c3).toInt();
    uint16_t carbi = rest.substring(c3 + 1, c4).toInt();
    String motorState = rest.substring(c4 + 1);
    motorState.trim();

    addStoredDose(ts, medName.c_str(), levo, carbi, motorState.c_str());
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);
  while (!Serial && millis() < 2000) {
    delay(10);
  }

  Serial.println("# Tremor AI ESP32 MPU6050 Telemetry & Flash Storage Firmware v3.0");
  Serial.println("# Target sampling rate: 100 Hz");

  loadStoredDoses();

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

  // Handle Serial incoming commands
  if (Serial.available()) {
    String incomingLine = Serial.readStringUntil('\n');
    incomingLine.trim();
    if (incomingLine.length() > 0) {
      if (incomingLine.equalsIgnoreCase("S") || incomingLine.startsWith("CMD:SYNC_HISTORY")) {
        syncStoredDosesToHost();
      } else if (incomingLine.startsWith("CMD:CLEAR_DOSES")) {
        clearStoredDoses();
      } else if (incomingLine.startsWith("CMD:LOG_DOSE,") || incomingLine.startsWith("DOSE:")) {
        parseAndSaveDoseCommand(incomingLine);
      }
    }
  }

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

      unsigned long timestamp_ms = millis();

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
