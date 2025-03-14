// #include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "ESP32MotorControl.h"

#define M1_FWD_PIN 12
#define M1_RVS_PIN 13
#define M2_FWD_PIN 14
#define M2_RVS_PIN 15

ESP32MotorControl motors = ESP32MotorControl();

#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

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
