//currently using board 2 as anchor 2
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
#include <string>

// leftmost two bytes below will become the "short address"
char anchor_addr[] = "43:00:5B:D5:A9:9A:E2:9C"; //#4
 
//calibrated Antenna Delay setting for this anchor
uint16_t Adelay = 16536;
uint16_t increment = 0;
 
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
 
Adafruit_MMC5603 mag = Adafruit_MMC5603(12345);

// Hard-iron calibration settings
const float hard_iron[3] = {
    -154.07,  56.57,  598.89
};

// Soft-iron calibration settings
const float soft_iron[3][3] = {
  {  1.172,  -0.007, -0.014  },
  {  -0.007,  1.044, 0.211  },
  {  -0.014,  0.211, 0.860  }
};


// connection pins
const uint8_t PIN_RST = 27; // reset pin
const uint8_t PIN_IRQ = 34; // irq pin
const uint8_t PIN_SS = 4;   // spi select pin

#define M1_FWD_PIN 12
#define M1_RVS_PIN 13
#define M2_FWD_PIN 14
#define M2_RVS_PIN 15

ESP32MotorControl motors = ESP32MotorControl();
//TODO swapping to board #4, change back later 
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
// #define SERVICE_UUID "137f26d4-af6f-40cd-bccd-1dcf833c71d0"
// #define CHARACTERISTIC_UUID "b06c0815-ebc6-43a3-ac68-025c7dd0ee77"

BLECharacteristic *pDataCharacteristic;
String distance = "0";
float uwb_dist = 0; 
float compass_heading = 0;
int turns_made = 0; //positive means right turn, negative means left turn

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
      //TODO check whether the code below sends data, or the modified motor1 code
      distance = pCharacteristic->getValue().c_str();
      // compass_heading = get_compass_heading();
      String temp = String(turns_made) + "," + String(compass_heading, 3);;
      Serial.print("String rep: ");
      Serial.println(temp);
      pDataCharacteristic->setValue(const_cast<char *>(temp.c_str()));
      Serial.print("Value Written before send ");
      Serial.println(pCharacteristic->getValue().c_str());
      pDataCharacteristic->notify();
      }
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

  //Compass init
  Serial.println("Adafruit_MMC5603 Magnetometer Compass");
  Serial.println("");
  // if (!mag.begin(MMC56X3_DEFAULT_ADDRESS, &Wire)) {  // I2C mode
  //   /* There was a problem detecting the MMC5603 ... check your connections */
  //   Serial.println("Ooops, no MMC5603 detected ... Check your wiring!");
  //   while (1) delay(10);
  // }

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

    DW1000Ranging.loop();
    // if (increment % 10 == 0) {
    //   compass_heading = get_compass_heading();
    // }
    // Serial.println("command = ");
    // Serial.println(distance);
    if (distance == "1") {//TODO:: move the data sending code elsewhere, restore motor functionality
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
    }
    if (distance == "3") {
    Serial.println("rt");
      //experimentally determine how many set_motor comm+ands have to run to turn the robot ~30 degrees
      set_motor(motors, 70, 70);
      turns_made++;
      delay(250);
    }
    if (distance == "4") {
      Serial.println("bk");
      set_motor(motors, -50, 50);
      turns_made = 0;
    }
    if (distance == "0") {//TODO change distance back to 0 after testing
      // Serial.println("stop");
      set_motor(motors, 0, 0);
    }
    increment++;
}

void newRange()
{
  //Changed this function for adding new tag
  //    Serial.print("from: ");
  // Serial.print("Tag: ");
  // Serial.print(DW1000Ranging.getDistantDevice()->getShortAddress(), HEX);
  DW1000Ranging.getDistantDevice()->getShortAddress();
  //Serial.print(", ");
  // Serial.print(", Distance: ");
  uwb_dist = DW1000Ranging.getDistantDevice()->getRange();
      Serial.print("uwb_dist: ");
      Serial.println(uwb_dist);
  // Serial.println(DW1000Ranging.getDistantDevice()->getRange());
 
#define NUMBER_OF_DISTANCES 1
  float dist = 0.0;
  for (int i = 0; i < NUMBER_OF_DISTANCES; i++) {
    dist += DW1000Ranging.getDistantDevice()->getRange();
  }
  dist = dist/NUMBER_OF_DISTANCES;
  // Serial.println(dist);
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
