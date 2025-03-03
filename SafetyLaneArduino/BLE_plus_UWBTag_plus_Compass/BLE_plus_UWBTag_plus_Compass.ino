//currently using board 3 as tag
// #include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "ESP32MotorControl.h"
#include <SPI.h>
#include "DW1000Ranging.h"
#include "DW1000.h"
#include <Adafruit_MMC56x3.h>

#define M1_FWD_PIN 12
#define M1_RVS_PIN 13
#define M2_FWD_PIN 14
#define M2_RVS_PIN 15

ESP32MotorControl motors = ESP32MotorControl();
//TODO swapping to board #3, change back later 
#define SERVICE_UUID "8b2bb238-084b-46da-9d34-bfb02eeca697"
#define CHARACTERISTIC_UUID "99ebf807-1f5c-4242-ab0d-cda33ecf939b"

// #define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
// #define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLECharacteristic *pDataCharacteristic;
String distance = "0";
float compass_heading = 77.777; // TODO:: change this
int turns_made = 0; //positive means right turn, negative means left turn

#define SPI_SCK 18
#define SPI_MISO 19
#define SPI_MOSI 23
#define DW_CS 4

uint16_t increment = 0;

/* Assign a unique ID to this sensor at the same time */
Adafruit_MMC5603 mag = Adafruit_MMC5603(12345);

// Hard-iron calibration settings
const float hard_iron[3] = {
    -54.39,  45.08,  -128.85
};

// Soft-iron calibration settings
const float soft_iron[3][3] = {
  {  1.168,  -0.009, -0.003  },
  {  -0.009,  1.078, 0.072  },
  {  -0.003,  0.072, 0.799  }
};

// connection pins
const uint8_t PIN_RST = 27; // reset pin
const uint8_t PIN_IRQ = 34; // irq pin
const uint8_t PIN_SS = 4;   // spi select pin
 
// TAG antenna delay defaults to 16384
// leftmost two bytes below will become the "short address"
char tag_addr[] = "7D:00:22:EA:82:60:3B:9C";


class MyServerCallbacks : public BLEServerCallbacks
{
  void onConnect(BLEServer *pServer)
  {
    Serial.println("Connected");
  };

  void onDisconnect(BLEServer *pServer)
  {
    Serial.println("Disconnected");
  }
};

float get_compass_heading(){
  static float hi_cal[3];

  /* Get a new sensor event */
  sensors_event_t event;
  mag.getEvent(&event);

  float Pi = 3.14159;
  // Put raw magnetometer readings into an array
  float mag_data[] = {event.magnetic.x,
                      event.magnetic.y,
                      event.magnetic.z};

  // Apply hard-iron offsets
  for (uint8_t i = 0; i < 3; i++) {
    hi_cal[i] = mag_data[i] - hard_iron[i];
  }
  float mag_data_corr[3];
  // Apply soft-iron scaling
  for (uint8_t i = 0; i < 3; i++) {
    mag_data_corr[i] = (soft_iron[i][0] * hi_cal[0])+  
                  (soft_iron[i][1] * hi_cal[1])+  
                  (soft_iron[i][2] * hi_cal[2]);
  }

  // Calculate the angle of the vector y,x
  float heading = (atan2(mag_data_corr[0],mag_data_corr[1]) * 180) / Pi;
  float heading_uncorrected = (atan2(mag_data[0],mag_data[1]) * 180) / Pi;

  // Normalize to 0-360
  if (heading < 0)
  {
    heading = 360 + heading;
  }
  // Serial.print("Compass Heading: ");
  // Serial.println(heading);
  // Serial.print("Uncorrected Compass Heading: ");
  // Serial.println(heading_uncorrected);
  delay(500);

  return heading;
}

void set_motor(ESP32MotorControl mots, int speed1, int speed2){ 
    // Serial.println("test");

  // set motor 1
  if (speed1 > 0){
    if (speed1 > 100){
      speed1 = 100;
    }
    mots.motorForward(0, speed1);
  }
  else if (speed1 == 0){
    mots.motorStop(0);
  }
  else {
    if (speed1 < -100){
      speed1 = -100;
    }
    mots.motorReverse(0, -speed1);
  }

  // set motor 2
  if (speed2 > 0){
    if (speed2 > 100){
      speed2 = 100;
    }
    mots.motorForward(1, speed2);
  }
  else if (speed2 == 0){
    mots.motorStop(1);
  }
  else {
    if (speed2 < -100){
      speed2 = -100;
    }
    mots.motorReverse(1, -speed2);
  }
  return;
}

class CharacteristicsCallbacks : public BLECharacteristicCallbacks
{
  void onWrite(BLECharacteristic *pCharacteristic)
  {
    Serial.print("Value Written ");
    Serial.println(pCharacteristic->getValue().c_str());

    if (pCharacteristic == pDataCharacteristic)
    {//TODO: this writeback is unneeded, but evalute if needed and remove/keep
      distance = pCharacteristic->getValue().c_str();
      // compass_heading = get_compass_heading();
      String temp = String(turns_made) + "," + String(compass_heading, 3);;
      Serial.print("String rep: ");
      // Serial.println(temp);
      pDataCharacteristic->setValue(const_cast<char *>(temp.c_str()));
      Serial.print("Value Written before send ");
      Serial.println(pCharacteristic->getValue().c_str());
      pDataCharacteristic->notify();
      }
  }
};


void setup() {
  // put your setup code here, to run once:
  // Wire.begin();
  Serial.begin(115200);
  delay(2000);
  motors.attachMotors(M1_FWD_PIN, M1_RVS_PIN, M2_FWD_PIN, M2_RVS_PIN);
  //init for uwb setup
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  DW1000Ranging.initCommunication(PIN_RST, PIN_SS, PIN_IRQ); //Reset, CS, IRQ pin
  
  DW1000Ranging.attachNewRange(newRange);
  DW1000Ranging.attachNewDevice(newDevice);
  DW1000Ranging.attachInactiveDevice(inactiveDevice);
  
// start as tag, do not assign random short address
  DW1000Ranging.startAsTag(tag_addr, DW1000.MODE_LONGDATA_RANGE_LOWPOWER, false);

  //Compass init
  Serial.println("Adafruit_MMC5603 Magnetometer Compass");
  Serial.println("");

  /* Initialise the sensor */
  // if (!mag.begin(MMC56X3_DEFAULT_ADDRESS, &Wire)) {  // I2C mode
  //   /* There was a problem detecting the MMC5603 ... check your connections */
  //   Serial.println("Ooops, no MMC5603 detected ... Check your wiring!");
  //   while (1) delay(10);
  // }

  // Create BLE device, server, and service
  BLEDevice::init("SafetyLane_3");

  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create data characteristic
  pDataCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_INDICATE);
  pDataCharacteristic->addDescriptor(new BLE2902());
  pDataCharacteristic->setCallbacks(new CharacteristicsCallbacks());
  // Start BLE server and advertising
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("BLE device is ready to be connected");
}

void loop() {
  // if(((increment / 1000) % 2) == 0){
  // }
  // else{
    // float compass_heading = get_compass_heading();

    // Serial.println("command = ");
    // Serial.println(distance);
    DW1000Ranging.loop();
    if (distance == "1") {
    Serial.println("fwd");
      set_motor(motors, 50, -50);
      turns_made = 0;
    }
    if (distance == "2") {
    Serial.println("lft");
      //experimentally determine how many set_motor commands have to run to turn the robot ~30 degrees
      set_motor(motors, -70, -70);
      turns_made--;
      delay(250);
      // distance = "0"; //stops command from turning left anymore
    }
    if (distance == "3") {
      //experimentally determine how many set_motor commands have to run to turn the robot ~30 degrees
      Serial.println("rt");
      set_motor(motors, 70, 70);
      turns_made++;
      delay(250);
      // distance = "0";//stops command from turning right anymore
    }
    if (distance == "4") {
      Serial.println("bk");
      set_motor(motors, -50, 50);
      turns_made = 0;
    }
    if (distance == "0") {
      // Serial.println("stop");
      set_motor(motors, 0, 0);
    }
  // }
  // increment++;
  // delay(500);
}

void newRange()
{
  // Serial.print(DW1000Ranging.getDistantDevice()->getShortAddress(), HEX);
  // Serial.print(",");
  // Serial.println(DW1000Ranging.getDistantDevice()->getRange());
}
 
void newDevice(DW1000Device *device)
{
  Serial.print("Device added: ");
  // Serial.println(device->getShortAddress(), HEX);
}
 
void inactiveDevice(DW1000Device *device)
{
  Serial.print("delete inactive device: ");
  // Serial.println(device->getShortAddress(), HEX);
}
