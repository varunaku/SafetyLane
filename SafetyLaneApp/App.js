import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Pressable, Button, TextInput, ScrollView } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { useState, useEffect, useRef } from "react";
import { btoa, atob } from "react-native-quick-base64";

const bleManager = new BleManager();

// Android Bluetooth Permission for location, may not be needed, if not remove permissions from AndroidManifest.xml

//TODO: There is a bug where the device attempts to reconnect while already connected, and it detects a duplicate connection but keeps trying to connect anyway. Implement handling for this

const SERVICE_UUID_1 = "137f26d4-af6f-40cd-bccd-1dcf833c71d0";
const CHARACTERISTIC_UUID_1 = "b06c0815-ebc6-43a3-ac68-025c7dd0ee77";
const deviceId_oldesp32_1 = "24:DC:C3:82:9C:86";
const deviceId_newesp32_1 = "3C:E9:0E:72:2B:4AB"; //might've cause issues with testing so i commented, uncomment if needed

const SERVICE_UUID_2 = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
const CHARACTERISTIC_UUID_2 = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
const deviceId_oldesp32_2 = "24:DC:C3:82:80:BE";
// const deviceId_newesp32_2 = "3C:E9:0E:72:2B:42"; //caused issues with testing so i commented, uncomment if needed
const deviceId_newesp32_2 = "08:3A:8D:96:73:56"; //same as above, added because of testing issues, delete if needed

const SERVICE_UUID_3 = "8b2bb238-084b-46da-9d34-bfb02eeca697"
const CHARACTERISTIC_UUID_3 = "99ebf807-1f5c-4242-ab0d-cda33ecf939b"
const deviceId_oldesp32_3 = "24:DC:C3:82:AE:12";
// const deviceId_newesp32_3 = "3C:E9:0E:72:32:4A"; //might've cause issues with testing so i commented, uncomment if needed
const deviceId_newesp32_3 = "3C:E9:0E:72:2B:42";

const SERVICE_UUID_4 = "dba26dec-3854-4434-8d23-76d8e3334c64"
const CHARACTERISTIC_UUID_4 = "2b7edb9e-2a2a-41d6-bd93-ad34f8c6cc11"
const deviceId_oldesp32_4 = "24:DC:C3:8D:38:6E";
const deviceId_newesp32_4 = "3C:E9:0E:72:2B:4A";
// const deviceId_newesp32_4 = "3C:E9:0E:72:32:4A"
// const stepData_UUID = "2b7edb9e-2a2a-41d6-bd93-ad34f8c6cc11";

let device_number = 0;
let all_devices = 1;
let single_robot_sending_device_1 = 0;
let single_robot_sending_device_2 = 0;
let single_robot_sending_device_3 = 0;

//Change these variables before starting app
const number_of_cones = 3;


export default function App() {

  const [deviceIDs, setDeviceIDs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("searching...");
  const [stepDataChar, setStepDataChar] = useState(null);
  const [stepDataChar2, setStepDataChar2] = useState(null);
  const [stepDataChar3, setStepDataChar3] = useState(null);
    //const [connected, setConnected] = useState(false);

  const [connectedDeviceNames, setConnectedDeviceNames] = useState([])
  //const deviceRefs = useRef({});
  const [dataCharacteristics, setDataCharacteristic] = useState([]); 

  const [coneSeperation, setConeSeperation] = useState(1);
  const [distances, setDistances] = useState([]); //repurposed for receiving data from esp
  const [displayDist, setDisplayDist] = useState(0); //repurposed for receiving data from esp
  const [displayDist2, setDisplayDist2] = useState(0); //repurposed for receiving data from esp
  const [displayHead, setDisplayHead] = useState(0); //repurposed for receiving data from esp
  const [displayHead2, setDisplayHead2] = useState(0); //repurposed for receiving data from esp
  const [headings, setHeadings] = useState([]); //repurposed for receiving data from esp
  const [distances2, setDistances2] = useState([]); //repurposed for receiving data from esp
  const [headings2, setHeadings2] = useState([]); //repurposed for receiving data from esp
  const [leadHeading, setLeadHeading] = useState(0); //repurposed for receiving data from esp
  const [turnsMade, setTurnsMade] = useState(0); //repurposed for receiving data from esp
  const [permissions, setPermissions] = useState(false);
  const [dotColor, setDotColor] = useState("transparent");

  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [singleConeMode, setSingleConeMode] = useState(false);
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleSelect = (value) => {
    setSelectedDevice(value);
    setSingleConeMode(true);
    setDropdownVisible(false);
    
    console.log(`Selected Device: ${value}`);
  };

  const handleToggleMode = () => {
    if (singleConeMode) {
      handlePress(9); // Exit mode and notify
      setSelectedDevice(null);
      setSingleConeMode(false);
      console.log("Exited Single Cone Mode");
      single_robot_sending_device_1 = 0;
      single_robot_sending_device_2 = 0;
      single_robot_sending_device_3 = 0;
    } else {
      handlePress(9);
      setDropdownVisible(!isDropdownVisible); // Open dropdown
    }
  };
  
  async function requestLocationPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: "Location permission for bluetooth scanning",
          message: "Grant location permission to allow the app to scan for Bluetooth devices",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Location permission for bluetooth scanning granted");
      } else {
        console.log("Location permission for bluetooth scanning denied");
      }
    } catch (err) {
      console.warn(err);
    }
  }
  
  async function requestBluetoothPermissions() {
    try {
      const grantedStatus1 = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
            title: 'Location Permission',
            message: 'Bluetooth Low Energy Needs Location Permission',
            buttonNegative: 'Cancel',
            buttonPostitive: 'Ok',
            buttonNeutral: 'Maybe Later',
        },);
        const grantedStatus2 = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
              title: 'Location Permission',
              message: 'Bluetooth Low Energy Needs Location Permission',
              buttonNegative: 'Cancel',
              buttonPostitive: 'Ok',
              buttonNeutral: 'Maybe Later',
          },);
          const grantedStatus3 = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            {
                title: 'Location Permission',
                message: 'Bluetooth Low Energy Needs Location Permission',
                buttonNegative: 'Cancel',
                buttonPostitive: 'Ok',
                buttonNeutral: 'Maybe Later',
            },
      );
    console.log("Permissions granted: ", grantedStatus1);
    console.log("Permissions granted: ", grantedStatus2);
    console.log("Permissions granted: ", grantedStatus3);
    setPermissions(true);
    return grantedStatus1 === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err){
      console.warn(err);
      console.log("Location permission for fine denied");
    }
  }
  
  requestLocationPermission();
  requestBluetoothPermissions();

  const searchAndConnectToDevice = async () => {
    const devicesToConnect = {};
    let foundDevices = 0;

    // Start scanning for devices
    console.log("Starting BLE device scan...");
    bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
            console.error("Error during device scan:", error);
            setConnectionStatus("Error searching for devices");
            return;
        }

        // Check for devices matching expected naming pattern
        //console.log("Device name: ", device.name);
        if (device.name && device.name.startsWith("SafetyLane_") && !connectedDeviceNames.includes(device.name)) {
            console.log("Discovered device:", device.name, device.id);

            // Add device to connection queue if not already added
            if (!devicesToConnect[device.name]) {
                devicesToConnect[device.name] = device;
                foundDevices++;

                // Stop scanning when all expected devices are discovered
                if (foundDevices === number_of_cones) {
                    console.log("All expected devices discovered. Stopping scan.");
                    bleManager.stopDeviceScan();
                }
            }
        }
    });

    // Wait for the scan to finish or timeout
    await new Promise((resolve) => setTimeout(() => {
        bleManager.stopDeviceScan();
        console.log("Scan timeout. Stopping scan.");
        resolve();
    }, 8000)); // Adjust timeout duration as needed

    // Connect to devices sequentially
    const deviceNames = Object.keys(devicesToConnect).sort(); // Sort to connect in order
    for (const deviceName of deviceNames) {
        const device = devicesToConnect[deviceName];
        console.log(`Connecting to device: ${deviceName}`);

        try {
            const connectedDevice = await connectToDevice(device);
            setConnectedDeviceNames((prevDevices) => [...prevDevices, connectedDevice.name]);
            console.log(`${connectedDevice.name} connected.`);
        } catch (error) {
            console.error(`Failed to connect to ${deviceName}:`, error);
        }
    }
    console.log("trying to add monitoring");
    console.log(deviceNames);

    //TODO: the following code is horrific, maybe clean it up later

    if (deviceNames.includes("SafetyLane_2")) {
      console.log("in dnames");
      let d2 = devicesToConnect["SafetyLane_2"];
      // console.log("d41=2: ", d4);
      let services = await d2.services();
      let service = services.find((service) => service.uuid === SERVICE_UUID_2);
      let characteristics = await service.characteristics();
      let stepDataCharacteristic = characteristics.find(
        (char) => char.uuid === CHARACTERISTIC_UUID_2
      );
      console.log("finding step data char uuid of", CHARACTERISTIC_UUID_2)
      setStepDataChar2(stepDataCharacteristic);
      stepDataCharacteristic.monitor((error, char) => {//monitor is what lets us recieve information from the board
        if (error) {
          console.error(error);
          return;
        }
        const rawData = atob(char.value);
        console.log("Received board 2 data:", rawData);
        addData2(rawData);
      });
    };
    if (deviceNames.includes("SafetyLane_3")) {
      console.log("in dnames");
      let d3 = devicesToConnect["SafetyLane_3"];
      // console.log("d41=2: ", d4);
      let services = await d3.services();
      let service = services.find((service) => service.uuid === SERVICE_UUID_3);
      let characteristics = await service.characteristics();
      let stepDataCharacteristic3 = characteristics.find(
        (char) => char.uuid === CHARACTERISTIC_UUID_3
      );
      console.log("finding step data char uuid of", CHARACTERISTIC_UUID_3)
      setStepDataChar3(stepDataCharacteristic3);
      stepDataCharacteristic3.monitor((error, char) => {//monitor is what lets us recieve information from the board
        if (error) {
          console.error(error);
          return;
        }
        const rawData = atob(char.value);
        console.log("Received board 3 data:", rawData);
        // addData(rawData);
        const values = rawData.split(",");
        const turns = values[0];
        const head_val = values[1]    
        setTurnsMade(turns);
        setLeadHeading(head_val);
      });
    };
    if (deviceNames.includes("SafetyLane_4")) {
      console.log("in dnames");
      let d4 = devicesToConnect["SafetyLane_4"];
      // console.log("d41=2: ", d4);
      let services = await d4.services();
      let service = services.find((service) => service.uuid === SERVICE_UUID_4);
      let characteristics = await service.characteristics();
      let stepDataCharacteristic = characteristics.find(
        (char) => char.uuid === CHARACTERISTIC_UUID_4
      );
      console.log("finding step data char uuid of", CHARACTERISTIC_UUID_4)
      setStepDataChar(stepDataCharacteristic);
      stepDataCharacteristic.monitor((error, char) => {//monitor is what lets us recieve information from the board
        if (error) {
          console.error(error);
          return;
        }
        const rawData = atob(char.value);
        console.log("Received board 4 data:", rawData);
        addData(rawData);
      });
    };

    console.log("Device connection process completed.");
  };

  const connectToDevice = async (device) => {
    console.log("connect start");
    try {
      const connectedDevice = await device.connect();
      console.log("Device Id is: ", connectedDevice.id)

      //Put deviceID into connectedDevices array
      setDeviceIDs((prevDevices) => [...prevDevices, connectedDevice.id]);
      console.log("List of connected devices: ", deviceIDs)
      await connectedDevice.discoverAllServicesAndCharacteristics();

      return connectedDevice;
    } catch (error) {
      console.log("Connection error: ", error);
      setConnectionStatus("Error in Connection");
    }
  };  

  async function sendData(value) { 
    console.log("new value ====", value);
    console.log("all_devices variable is: ", all_devices);
    try {

      if(value == 9){
        if(all_devices == 1){
          all_devices = 0;
          return null;
        }
        else if(all_devices == 0){
          all_devices = 1;
          return null;
        }
      }
      if(value == 11){
        if(single_robot_sending_device_1 == 0){
          single_robot_sending_device_1 = 1;
          return null;
        }
      }
      if(value == 12){
        if(single_robot_sending_device_2 == 0){
          single_robot_sending_device_2 = 1;
          return null;
        }
      }
      if(value == 13){
        if(single_robot_sending_device_3 == 0){
          single_robot_sending_device_3 = 1;
          return null;
        }
      }

      if(all_devices == 1){

        console.log("Number of connected devices is: ", deviceIDs.length);
        console.log("Device ID's are: ", deviceIDs);
        
        // Iterate through connected devices and send data
        const sendPromises = deviceIDs.map((deviceID, index) => {
          let serviceUUID;
          let characteristicUUID;
          
          if(deviceID === deviceId_oldesp32_1){
            //safetyLane 1
            device_number = 1;
            serviceUUID = SERVICE_UUID_1;
            characteristicUUID = CHARACTERISTIC_UUID_1;
          }

          else if(deviceID === deviceId_newesp32_1){
            //safetyLane 1 new esp32
            device_number = 1;
            serviceUUID = SERVICE_UUID_1;
            characteristicUUID = CHARACTERISTIC_UUID_1;
          }

          else if(deviceID === deviceId_oldesp32_2){
            //safety lane 2
            device_number = 2;
            serviceUUID = SERVICE_UUID_2;
            characteristicUUID = CHARACTERISTIC_UUID_2;
          }

          else if(deviceID === deviceId_newesp32_2){
            //safety lane 2 new esp32
            device_number = 2;
            serviceUUID = SERVICE_UUID_2;
            characteristicUUID = CHARACTERISTIC_UUID_2;
          }

          else if(deviceID === deviceId_oldesp32_3){
            //safety lane 3
            device_number = 3;
            serviceUUID = SERVICE_UUID_3;
            characteristicUUID = CHARACTERISTIC_UUID_3;
          }

          else if(deviceID === deviceId_newesp32_3){
            //safety lane 3 new esp32
            device_number = 3;
            serviceUUID = SERVICE_UUID_3;
            characteristicUUID = CHARACTERISTIC_UUID_3;
          }

          else if(deviceID === deviceId_oldesp32_4){
            //safety lane 4
            device_number = 4;
            serviceUUID = SERVICE_UUID_4;
            characteristicUUID = CHARACTERISTIC_UUID_4;
          }
          else if(deviceID === deviceId_newesp32_4){
            device_number = 4;
            serviceUUID = SERVICE_UUID_4;
            characteristicUUID = CHARACTERISTIC_UUID_4;
          }
          console.log("Device Id is: ", deviceID)
          console.log("ServiceUUID is:", serviceUUID);
          console.log("CharacteristicUUID is: ", characteristicUUID);
          encodedData = btoa(value.toString());
          return bleManager.writeCharacteristicWithResponseForDevice(
            deviceID,
            serviceUUID,
            characteristicUUID,
            encodedData
          )
        });
        
        // Wait for all promises to resolve
        console.log("Made it here");
        await Promise.all(sendPromises);
        console.log("Data sent to all devices");
      }

      else if(all_devices == 0){
        console.log("Send to individual devices");
        console.log("Number of connected devices is: ", deviceIDs.length);
        console.log("Device ID's are: ", deviceIDs);
        let serviceUUID;
        let characteristicUUID;
        let deviceID;

        console.log(single_robot_sending_device_1);
        console.log(single_robot_sending_device_2);
        console.log(single_robot_sending_device_3);
        // Find the specfied device and send data
        if (single_robot_sending_device_1 == 1){
          //TODO:: CHANGE THIS BACK TO 1 after testing
          deviceID = deviceId_newesp32_3;
          serviceUUID = SERVICE_UUID_3;
          characteristicUUID = CHARACTERISTIC_UUID_3;

          console.log("ServiceUUID is:", serviceUUID);
          console.log("CharacteristicUUID is: ", characteristicUUID);
          encodedData = btoa(value.toString());
          let result = await bleManager.writeCharacteristicWithResponseForDevice(
            deviceID,
            serviceUUID,
            characteristicUUID,
            encodedData
          );
          console.log("Send data only to device 1");
          return result;
        }
        else if (single_robot_sending_device_2 == 1){
          deviceID = deviceId_newesp32_2;
          serviceUUID = SERVICE_UUID_2; 
          characteristicUUID = CHARACTERISTIC_UUID_2; 

          console.log("ServiceUUID is:", serviceUUID);
          console.log("CharacteristicUUID is: ", characteristicUUID);
          encodedData = btoa(value.toString());
          let result = await bleManager.writeCharacteristicWithResponseForDevice(
            deviceID,
            serviceUUID,
            characteristicUUID,
            encodedData
          );
          console.log("Send data only to device 2");
          return result;
        }
        else if (single_robot_sending_device_3 == 1){
          deviceID = deviceId_newesp32_4;
          serviceUUID = SERVICE_UUID_4; //changed from 3
          characteristicUUID = CHARACTERISTIC_UUID_4; //changed from 3

          console.log("ServiceUUID is:", serviceUUID);
          console.log("CharacteristicUUID is: ", characteristicUUID);
          encodedData = btoa(value.toString());
          let result = await bleManager.writeCharacteristicWithResponseForDevice(
            deviceID,
            serviceUUID,
            characteristicUUID,
            encodedData
          );
          console.log("Send data only to device 3");
          return result;
        }
        else {
          console.log("No valid device selected");
          return null; // Handle case where no device is selected
        }
      }
    
    } catch (err) {
      console.log("Error: ", err)
    }
  };

  function handlePress(value) {
    console.log("pressable Pressed Down ", value);
    sendData(value);
  };
  function addData(val) {
    // "given string "0.31,51.123" split into 2 
    const values = val.split(",");
    const dist_val = values[0];
    const head_val = values[1]
    setDisplayDist(dist_val);
    setDisplayHead(head_val);
    setDistances((prev) => {
      console.log("running addDistance: ", prev, " vs ", dist_val)
      if (prev.length < 5) {
        return [...prev, dist_val];
      }
      return prev;
    })
    setHeadings((prev) => {
      console.log("running addDistance: ", prev, " vs ", head_val)
      if (prev.length < 5) {
        return [...prev, head_val];
      }
      return prev;
    })
  };
  function addData2(val) {
    // "given string "0.31,51.123" split into 2 
    const values = val.split(",");
    const dist_val = values[0];
    const head_val = values[1]
    setDisplayDist2(dist_val);
    setDisplayHead2(head_val);
    setDistances2((prev) => {
      console.log("running addDistance: ", prev, " vs ", dist_val)
      if (prev.length < 5) {
        return [...prev, dist_val];
      }
      return prev;
    })
    setHeadings2((prev) => {
      console.log("running addDistance: ", prev, " vs ", head_val)
      if (prev.length < 5) {
        return [...prev, head_val];
      }
      return prev;
    })
  };
  async function handleRealign(value) {
    console.log("realign Pressed Down ", value);
    setDistances([]); //init to empty array
    setHeadings([]); //init to empty array
    setDistances2([]); //init to empty array
    setHeadings2([]); //init to empty array

    for (let i = 0; i < 5; i++) {
      await sendData(value);
      await delay(500); //delay in ms, change depending on in person trials
    }
  };  
  function angleDifference(a, b) {
    let diff = (b - a + 180) % 360 - 180;
    return diff < -180 ? diff + 360 : diff;
  }
  function degreesToRadians(deg) {
    return deg * (Math.PI / 180);
  }
  
  function radiansToDegrees(rad) {
    return rad * (180 / Math.PI);
  }
  function findRoot(a, b, c) {
    //code from https://www.geeksforgeeks.org/javascript-program-to-solve-quadratic-equation/ 
    let d = b * b - 4 * a * c; 
    let sqrt_val = Math.sqrt(Math.abs(d)); 
        console.log('value d is ', d); 
    if (d > 0) { 
        console.log('Roots are real and different'); 
        console.log( 
            (-b + sqrt_val) / (2 * a) + " and " + 
            (-b - sqrt_val) / (2 * a) 
        ); 
        return [(-b + sqrt_val) / (2 * a), (-b - sqrt_val) / (2 * a) ];
    } 
    else if (d == 0) { 
        console.log('Roots are real and same'); 
        console.log(-b / (2 * a) + " and " + 
            -b / (2 * a)); 
        return [-b / (2 * a)];
    }   
    // d < 0 
    else { 
        console.log('error in finding direction'); 
        console.log(
            (-b / (2 * a)) + " + i" + (sqrt_val / (2 * a)) + " and " + 
            (-b / (2 * a)) + " - i" + (sqrt_val / (2 * a))
        );
        let mag1 = Math.sqrt((b / (2 * a))*(b / (2 * a)) + (sqrt_val / (2 * a))*(sqrt_val / (2 * a)))
        console.log("magnitude 1: ", mag1)
        return [mag1];
    } 
  }  
  function computeCone2Correction(d13, d12, bearing1, bearing2, bearing3) {
    // The ideal position for cone2 is exactly halfway from cone1 to cone3.
    const idealDistance = d13 / 2;
    const idealX = idealDistance * Math.cos(degreesToRadians(bearing3));
    const idealY = idealDistance * Math.sin(degreesToRadians(bearing3));
  
    // Current (actual) position of cone2 in Cartesian coordinates.
    const actualX = d12 * Math.cos(degreesToRadians(bearing2));
    const actualY = d12 * Math.sin(degreesToRadians(bearing2));
  
    // Compute the correction vector from cone2's current position to its ideal position.
    const dx = idealX - actualX;
    const dy = idealY - actualY;
  
    // The distance to move is the magnitude of the correction vector.
    const distance = Math.sqrt(dx * dx + dy * dy);
  
    // Compute the absolute target angle for movement.
    let targetAngle = radiansToDegrees(Math.atan2(dy, dx));
    if (targetAngle < 0) {
      targetAngle += 360;
    }
  
    // Compute the **relative turn angle** needed.
    let relativeBearing = targetAngle - bearing2;
  
    // Normalize relativeBearing to be within -180° to +180° range for minimal turning.
    if (relativeBearing > 180) {
      relativeBearing -= 360;
    } else if (relativeBearing < -180) {
      relativeBearing += 360;
    }
  
    return {
      relativeBearing: relativeBearing.toFixed(2) + "°",
      distance: distance.toFixed(3) + " m"
    };
  }
  
  async function handleTurnEnd() {
    // -cone1 is moved forward a preset amount, say 3xseperation distance
    //either use delay or do it inside arduino code
    //CONE 1 START ====
    await sendData(1);
    await delay(2000 * 3 * coneSeperation);
    await sendData(0);


    //CONE 2 START ====
    // -code switches to send to cone 2 only
    single_robot_sending_device_1 = 0
    single_robot_sending_device_2 = 1
    //first move cone 2 1 seperation distance forwards
    await sendData(1);
    await delay(3000 * 1.5 * coneSeperation);
    await sendData(0);
 
    //turn robot 2 the required distance
    let turns_copy = turnsMade;
    if (turns_copy > 0) {
      //>0 means right turn
      for (let i = 0; i < turns_copy; i++) {
        await sendData(3)
        await delay(100)
        await sendData(0)
      }
      await sendData(0)
    } else if (turns_copy < 0) {
      // <0 means left turn
      turns_copy = turns_copy * -1;
      for (let i = 0; i < turns_copy; i++) {
        await sendData(2)
        await delay(100)
        await sendData(0)
      }
      await sendData(0)
      turns_copy = turns_copy * -1;
    }
    else {
      //0 degree turn, just move forward
    }    
    // cone 2 moves forward 2xseperation distance
    await sendData(1);
    await delay(2000 * 1.5 * coneSeperation);
    await sendData(0);

    //CONE 3 START ====
    single_robot_sending_device_2 = 0
    single_robot_sending_device_3 = 1

    // cone 3 moves forwards 2 cone seperations 
    await sendData(1);
    await delay(2000 * 2 * coneSeperation);
    await sendData(0);

    if (turns_copy > 0) {
      //>0 means right turn
      for (let i = 0; i < turns_copy; i++) {
        await sendData(3)
        await delay(100)
        await sendData(0)
      }
      await sendData(0)
    } else if (turns_copy < 0) {
      // <0 means left turn
      turns_copy = turns_copy * -1;
      for (let i = 0; i < turns_copy; i++) {
        await sendData(2)
        await delay(100)
        await sendData(0)
      }
      await sendData(0)
      turns_copy = turns_copy * -1;
    }
    else {
      //0 degree turn, just move forward
    }    
    await sendData(1);
    await delay(2000 *0.5* coneSeperation);
    await sendData(0);

    single_robot_sending_device_1 = 0;
    single_robot_sending_device_2 = 0;
    single_robot_sending_device_3 = 0;
    all_devices = 1;
  };
  async function handleLeftRight(val) {
    await sendData(val);
    // await delay(500);
    // await sendData(0);
  };
  function handleRelease() {
    console.log("button released", 0);
    sendData(0);
  };
  function onSubmitSeperation() {
    console.log("new seperation: ", coneSeperation)
    
    // newNum = +coneSeperation + 50
    sendData(coneSeperation);
  }

  useEffect(() => {
    if (permissions) {
      console.log("starting the search and connect");
      //searchAndConnectToDevice();
      // while (connectionStatus == "Error searching for devices") {
      //   console.log("inside while, second run")
      //   searchAndConnectToDevice();
      // }
      const startConnectionProcess = async () => {
        try {
            await searchAndConnectToDevice();
            console.log("All devices connected successfully.");
        } catch (error) {
            console.error("Error during the device connection process:", error);
        }
      };

      startConnectionProcess(); // Call the async function
    }}, [permissions]);

    useEffect(()=>{
      //this check is for the middle robot in a line of three
      if (distances.length >= 5 && distances2.length >= 5 && headings.length >= 5 && headings.length >=5) { //add condiiton for compass check
        //calculation

        const sortedDist = distances.sort((a,b) => a - b);
        const sortedHead = headings.sort((a,b) => a - b);
        const sortedDist2 = distances2.sort((a,b) => a - b);
        const sortedHead2 = headings2.sort((a,b) => a - b);
        console.log("printing distances =========");
        for (let i = 0; i < 5; i++ ) {
          console.log("i=",i, "| d=", sortedDist[i]);
        }
        console.log("selected median as ", sortedDist[2])
        console.log("selected median as ", sortedHead[2])

  // ----- Example Usage -----
        const d13 = sortedDist2[2];       // Cone1 to cone3 distance in meters.
        const d12 = sortedDist[2];          // Current cone1 to cone2 distance in meters.
        const bearing1 = leadHeading;   // Cone1's bearing (not used here).
        const bearing2 = sortedDist2[2];   // Current bearing of cone2 (deviated from ideal).
        const bearing3 = sortedDist[2];   // Bearing from cone1 to cone3 (ideal line).
        
        const correction = computeCone2Correction(d13, d12, bearing1, bearing2, bearing3);
        
        console.log("Relative Bearing: " + correction.relativeBearing);
        console.log("Correction Distance: " + correction.distance);
  
        all_devices = 0;
        single_robot_sending_device_2 = 1;
        //lets say the robot turns 15 degrees for each left/right assignment
        const data = async (headings2, headings, desired_turn, desired_dist, leadHeading) => { //this function is just so we can use async await
          //first turn robot towards desired location
          if (headings2[2] > headings[2]) {
              for (let i = 0; i < Math.floor(desired_turn/15); i++){
                await sendData(3);
              }
              await sendData(0)
    
            } else if (headings2[2] < headings[2]) {
              for (let i = 0; i < Math.floor(desired_turn/15); i++){
                await sendData(4);
              }
              await sendData(0)
            }  
          //next move robot a certain amount
          await sendData(1);
          let m_to_ms = 1000;
          await delay(desired_dist*m_to_ms); //use a constant based on how long it takes to move 0.5m
          //finally turn robot to face leader
          let current_heading = (headings2[2] + desired_turn) % 360;

          if (current_heading > leadHeading) {
            for (let i = 0; i < Math.floor((current_heading - leadHeading)/15); i++){
              await sendData(3);
            }
            await sendData(0)
  
          } else if (current_heading < leadHeading) {
            for (let i = 0; i < Math.floor((current_heading - leadHeading)/15); i++){
              await sendData(4);
            }
            await sendData(0)
          }           
        }

        data(headings2, headings, correction.relativeBearing, correction.distance, leadHeading);                
        all_devices = 1;
        single_robot_sending_device_2 = 0;
      } 
      //send data to each robot 
    }, [distances, distances2])
    useEffect(()=>{
      //check that we have distance + heading
      if (distances2.length >= 5 && headings2.length >=5) { //add condiiton for compass check
        //calculation

        const sortedDist = distances2.sort((a,b) => a - b);
        const sortedHead = headings2.sort((a,b) => a - b);
        console.log("printing distances =========");
        for (let i = 0; i < 5; i++ ) {
          console.log("i=",i, "| d=", sortedDist[i]);
        }
        console.log("selected median as ", sortedDist[2])
        console.log("selected median as ", sortedHead[2])
        //how are we gonna error correct?
        //hard code a couple groups, ex: within 30deg of leader, within 90, within 180, then run a hardcoded case 
      } 
      //send data to each robot 
    }, [distances2])

return (
  <View style={styles.container}>
    <Text style={styles.connectionStatus}>{"Connected"}</Text>

    {/* <View style={styles.dataBox}>
        <Text style={styles.buttonText}>UWB Distance Cone 1 to 2: {displayDist}</Text>
        <Text style={styles.buttonText}>UWB Distance Cone 1 to 3: {displayDist2}</Text>
        <Text style={styles.buttonText}>Heading from Cone 1: {leadHeading}</Text>
        <Text style={styles.buttonText}>Heading From Cone 2: {displayHead}</Text>
        <Text style={styles.buttonText}>Heading From Cone 3: {displayHead2}</Text>
      </View> */}


    {/* Cone Separation Input */}
    <View style={styles.topRight}>
      <View style={styles.inputContainer}>
        <Text style={styles.buttonText}>Cone Separation: </Text>
        <TextInput
          style={styles.textInput}
          onChangeText={setConeSeperation}
          onSubmitEditing={onSubmitSeperation}
          value={coneSeperation.toString()}
          defaultValue="1"
          keyboardType="numeric"
        />
        <Text style={styles.buttonText}>m</Text>
      </View>
    </View>

    {/* Realign Cones Button */}
    <View style={styles.centered}>
    <Pressable style={styles.realignButton} onPressIn={() => handleRealign(6)}>
          <Text style={styles.buttonText}>Realign Cones</Text>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </Pressable>
        <View style={styles.buttonBox}>
        <Pressable style={styles.realignButton2} onPressIn={() => {
          //disable other button inputs
          single_robot_sending_device_1 = 1
          all_devices = 0;
          handlePress(7)
          }}>
          <Text style={styles.buttonText}>Start Turn</Text>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </Pressable>
          <View style={styles.paddingBox}></View>
        <Pressable style={styles.realignButton2} onPressIn={() => {
          //re-enable other button inputs
          handleTurnEnd()
          }}>
          <Text style={styles.buttonText}>End Turn</Text>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </Pressable>
      </View>
      {/* D-Pad Controls */}
      <View style={styles.dPadContainer}>
        <Pressable
          style={[styles.buttonContainer, styles.upButton]}
          onPressIn={() => handlePress(1)}
          onPressOut={handleRelease}
        >
          <Text style={styles.buttonText}>Forward</Text>
        </Pressable>
        <View style={styles.middleRow}>
          <Pressable
            style={[styles.buttonContainer, styles.leftButton]}
            onPressIn={() => handlePress(2)}
            onPressOut={handleRelease}
          >
            <Text style={styles.buttonText}>Left</Text>
          </Pressable>
          <Pressable
            style={[styles.buttonContainer, styles.rightButton]}
            onPressIn={() => {handleLeftRight(3)}}
            onPressOut={handleRelease}
          >
            <Text style={styles.buttonText}>Right</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.buttonContainer, styles.downButton]}
          onPressIn={() => handleLeftRight(4)}
          onPressOut={handleRelease}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>      
    </View>
        {/* Dropdown Button */}
        <View style={styles.alignButton}>
      <Pressable
        style={styles.realignButton}
        //</View>onPress={() => {
          //handlePress(9); // Send 9 when button is pressed
          //setDropdownVisible(!isDropdownVisible); // Toggle dropdown visibility
        //}}
        onPress={handleToggleMode}
      >
      <Text style={singleConeMode ? styles.testButtonText : styles.buttonText }>
        {singleConeMode ? `Press to Disable Singular Control for Device ${selectedDevice - 10}` : 'Send To All Devices'}
      </Text>
      {singleConeMode ? null : <View style={[styles.dot, { backgroundColor: '#00ff00' }]} /> }
      </Pressable>

      {/* Dropdown Menu. handleSelect(11, 12, or 13) */}
      {isDropdownVisible && (
        <View style={styles.dropdown}>
        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
          {[1, 2, 3].map((item) => (
            <Pressable key={item} style={styles.dropdownItem} onPress={() => {handlePress(item + 10); handleSelect(item + 10);}}> 
              <Text style={styles.buttonText}>Cone {item}</Text>
            </Pressable>
          ))}
          </ScrollView>
        </View>
      )}
    </View>


    <StatusBar style="auto" />
  </View>
)};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  connectionStatus: {
    color: '#00ffff',
    fontSize: 20,
    fontFamily: 'Courier', 
    marginBottom: 20,
    textAlign: 'center',
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 5,
    width: '90%',
  },
  topRight: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    borderRadius: 5,
    padding: 10,
  },
  textInput: {
    color: '#00ffff',
    backgroundColor: '#222',
    padding: 5,
    borderRadius: 3,
    marginHorizontal: 5,
    textAlign: 'center',
    width: 40,
  },
  centered: {
    alignItems: 'center',
  },
  realignButton: {
    alignItems: 'center',
    backgroundColor: '#ff4500',
    borderRadius: 5,
    marginBottom: 20,
    padding: 10,
    width: 200,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  realignButton2: {
    alignItems: 'center',
    backgroundColor: '#ff4500',
    borderRadius: 5,
    marginBottom: 20,
    padding: 10,
    width: 90,
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  paddingBox: {
    margin: 10,
  },
  dPadContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 125,
    padding: 10,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 5,
  },
  buttonContainer: {
    alignItems: 'center',
    backgroundColor: '#ff4500',
    borderRadius: 15,
    padding: 15,
    margin: 5,
    width: 85,
    height: 85,
    justifyContent: 'center',
  },
  upButton: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -35,
  },
  downButton: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    marginLeft: -35,
  },
  leftButton: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -40,
  },
  rightButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -40,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  rightAligned: {
    position: 'absolute',
    right: 85,
    top: '83%',
    transform: [{ translateY: -20 }], // Center vertically
  },
  alignButton: {
    position: 'absolute',
    right: 85,
    top: '83%',
    transform: [{ translateY: -20 }], // Center vertically
  },
  buttonBox: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dataBox: {
    position: 'absolute',
    top: "10%",
  },
  // Added Styles for Dropdown Menu
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#333',
    borderRadius: 5,
    padding: 5,
    zIndex: 1,
    width: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // For Android shadow effect
  },
  dropdownScroll: {
    maxHeight: 200, // Limits the height and makes it scrollable
  },
  dropdownItem: {
    padding: 10,
    backgroundColor: '#444',
    marginVertical: 2,
    borderRadius: 5,
    alignItems: 'center',
  },
})