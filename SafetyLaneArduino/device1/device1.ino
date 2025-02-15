// #include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "ESP32MotorControl.h"
#include <SPI.h>
#include "DW1000Ranging.h"
#include "DW1000.h"

// leftmost two bytes below will become the "short address"
char anchor_addr[] = "84:00:5B:D5:A9:9A:E2:9C"; //#4
 
//calibrated Antenna Delay setting for this anchor
uint16_t Adelay = 16536;
 
// previously determined calibration results for antenna delay
// #1 16630
// #2 16610
// #3 16607
// #4 16580
 
// calibration distance
float dist_m = 0.68; //meters
 
#define SPI_SCK 18
#define SPI_MISO 19
#define SPI_MOSI 23
#define DW_CS 4
 
// connection pins
const uint8_t PIN_RST = 27; // reset pin
const uint8_t PIN_IRQ = 34; // irq pin
const uint8_t PIN_SS = 4;   // spi select pin

#define M1_FWD_PIN 12
#define M1_RVS_PIN 13
#define M2_FWD_PIN 14
#define M2_RVS_PIN 15

ESP32MotorControl motors = ESP32MotorControl();

#define SERVICE_UUID "137f26d4-af6f-40cd-bccd-1dcf833c71d0"
#define CHARACTERISTIC_UUID "b06c0815-ebc6-43a3-ac68-025c7dd0ee77"

BLECharacteristic *pDataCharacteristic;
String distance = "0";

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
    {
      distance = pCharacteristic->getValue().c_str();
      pDataCharacteristic->setValue(const_cast<char *>(distance.c_str()));
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
  // //uwb init
  Serial.println("Anchor config and start");
  Serial.print("Antenna delay ");
  Serial.println(Adelay);
  Serial.print("Calibration distance ");
  Serial.println(dist_m);
 
  //init the configuration
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  DW1000Ranging.initCommunication(PIN_RST, PIN_SS, PIN_IRQ); //Reset, CS, IRQ pin
 
  // set antenna delay for anchors only. Tag is default (16384)
  DW1000.setAntennaDelay(Adelay);
 
  DW1000Ranging.attachNewRange(newRange);
  DW1000Ranging.attachNewDevice(newDevice);
  DW1000Ranging.attachInactiveDevice(inactiveDevice);
 
  //start the module as an anchor, do not assign random short address
  DW1000Ranging.startAsAnchor(anchor_addr, DW1000.MODE_LONGDATA_RANGE_LOWPOWER, false);
  // DW1000Ranging.startAsAnchor(ANCHOR_ADD, DW1000.MODE_SHORTDATA_FAST_LOWPOWER);
  // DW1000Ranging.startAsAnchor(ANCHOR_ADD, DW1000.MODE_LONGDATA_FAST_LOWPOWER);
  // DW1000Ranging.startAsAnchor(ANCHOR_ADD, DW1000.MODE_SHORTDATA_FAST_ACCURACY);
  // DW1000Ranging.startAsAnchor(ANCHOR_ADD, DW1000.MODE_LONGDATA_FAST_ACCURACY);
  // DW1000Ranging.startAsAnchor(ANCHOR_ADD, DW1000.MODE_LONGDATA_RANGE_ACCURACY);


  // Create BLE device, server, and service
  BLEDevice::init("SafetyLane_1");

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
  DW1000Ranging.loop();

  Serial.println("command = ");
  Serial.println(distance);
  if (distance == "1") {
  Serial.println("fwd");
    set_motor(motors, 100, -100);
  }
  if (distance == "2") {
  Serial.println("lft");
    set_motor(motors, 0, -100);
  }
  if (distance == "3") {
  Serial.println("rt");
    set_motor(motors, 100, 0);
  }
  if (distance == "4") {
    Serial.println("bk");
    set_motor(motors, -100, 100);
  }
  if (distance == "0") {
    Serial.println("stop");
    set_motor(motors, 0, 0);
  }

  delay(500);
}

void newRange()
{
  //Changed this function for adding new tag
  //    Serial.print("from: ");
  Serial.print("Tag: ");
  Serial.print(DW1000Ranging.getDistantDevice()->getShortAddress(), HEX);
  //Serial.print(", ");
  Serial.print(", Distance: ");
  Serial.println(DW1000Ranging.getDistantDevice()->getRange());
 
#define NUMBER_OF_DISTANCES 1
  float dist = 0.0;
  for (int i = 0; i < NUMBER_OF_DISTANCES; i++) {
    dist += DW1000Ranging.getDistantDevice()->getRange();
  }
  dist = dist/NUMBER_OF_DISTANCES;
  Serial.println(dist);
}
 
void newDevice(DW1000Device *device)
{
  Serial.print("Device added: ");
  Serial.println(device->getShortAddress(), HEX);
}
 
void inactiveDevice(DW1000Device *device)
{
  Serial.print("Delete inactive device: ");
  Serial.println(device->getShortAddress(), HEX);
}