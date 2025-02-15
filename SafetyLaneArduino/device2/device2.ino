//device 2 is a tag with motor control
// #include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "ESP32MotorControl.h"
#include <SPI.h>
#include "DW1000Ranging.h"
#include "DW1000.h"

#define M1_FWD_PIN 12
#define M1_RVS_PIN 13
#define M2_FWD_PIN 14
#define M2_RVS_PIN 15

ESP32MotorControl motors = ESP32MotorControl();

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLECharacteristic *pDataCharacteristic;
String distance = "0";

#define SPI_SCK 18
#define SPI_MISO 19
#define SPI_MOSI 23
#define DW_CS 4
 
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
  //init for uwb setup
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI);
  DW1000Ranging.initCommunication(PIN_RST, PIN_SS, PIN_IRQ); //Reset, CS, IRQ pin
  
  DW1000Ranging.attachNewRange(newRange);
  DW1000Ranging.attachNewDevice(newDevice);
  DW1000Ranging.attachInactiveDevice(inactiveDevice);
  
// start as tag, do not assign random short address
  
  DW1000Ranging.startAsTag(tag_addr, DW1000.MODE_LONGDATA_RANGE_LOWPOWER, false);

  // Create BLE device, server, and service
  BLEDevice::init("SafetyLane_2");

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
  Serial.println("ranging started ");
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
  Serial.print(DW1000Ranging.getDistantDevice()->getShortAddress(), HEX);
  Serial.print(",");
  Serial.println(DW1000Ranging.getDistantDevice()->getRange());
}
 
void newDevice(DW1000Device *device)
{
  Serial.print("Device added: ");
  Serial.println(device->getShortAddress(), HEX);
}
 
void inactiveDevice(DW1000Device *device)
{
  Serial.print("delete inactive device: ");
  Serial.println(device->getShortAddress(), HEX);
}