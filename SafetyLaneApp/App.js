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
const number_of_cones = 2;


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
  const [headings, setHeadings] = useState([]); //repurposed for receiving data from esp
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

    // if (deviceNames.includes("SafetyLane_2")) {
    //   console.log("in dnames");
    //   let d2 = devicesToConnect["SafetyLane_2"];
    //   // console.log("d41=2: ", d4);
    //   let services = await d2.services();
    //   let service = services.find((service) => service.uuid === SERVICE_UUID_2);
    //   let characteristics = await service.characteristics();
    //   let stepDataCharacteristic = characteristics.find(
    //     (char) => char.uuid === CHARACTERISTIC_UUID_2
    //   );
    //   console.log("finding step data char uuid of", CHARACTERISTIC_UUID_2)
    //   setStepDataChar2(stepDataCharacteristic);
    //   stepDataCharacteristic.monitor((error, char) => {//monitor is what lets us recieve information from the board
    //     if (error) {
    //       console.error(error);
    //       return;
    //     }
    //     const rawData = atob(char.value);
    //     console.log("Received board 2 data:", rawData);
    //     // addData(rawData);
    //   });
    // };
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
        // addData(rawData);
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
          deviceID = deviceId_newesp32_1;
          serviceUUID = SERVICE_UUID_1;
          characteristicUUID = CHARACTERISTIC_UUID_1;

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
          serviceUUID = SERVICE_UUID_3; //changed from 2
          characteristicUUID = CHARACTERISTIC_UUID_3; //changed from 2

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
          deviceID = deviceId_newesp32_3;
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
  async function handleRealign(value) {
    console.log("realign Pressed Down ", value);
    setDistances([]); //init to empty array
    setHeadings([]); //init to empty array

    for (let i = 0; i < 5; i++) {
      await sendData(value);
      await delay(1000); //delay in ms, change depending on in person trials
    }
    // await delay(1000); //delay in ms, change depending on in person trials
    // console.log("printing distances array", distances);

    // const sortedArr = distances.sort((a,b) => a - b);
    // console.log("printing distances =========");
    // for (let i = 0; i < 5; i++ ) {
    //   console.log("i=",i, "| d=", sortedArr[i]);
    // }

  };  
  function handleRelease() {
    console.log("button released", 0);
    sendData(0);
  };
  function onSubmitSeperation() {
    console.log("new seperation: ", coneSeperation)
    newNum = +coneSeperation + 50
    sendData(newNum);
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
      console.log("inside useEffect")
      //check that we have distance + heading
      if (distances.length >= 5) { //add condiiton for compass check
        //calculation

        const sortedDist = distances.sort((a,b) => a - b);
        const sortedHead = headings.sort((a,b) => a - b);
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
    }, [distances])
//   return (
//     <View style={styles.container}>
//       <Text style={styles.connectionStatus}>{connectionStatus}</Text>
//       <View style={styles.rightAligned}>
//         <Pressable style={styles.realignButton} onPressIn={() => handlePress(9)}>
//           <Text style={styles.buttonText}>Send To All Devices</Text>
//           <View style={[styles.dot, { backgroundColor: dotColor }]} />
//         </Pressable>
//       </View>
//       <View style={styles.topRight}>
//         <View style={styles.inputContainer}>
//           <Text style={styles.buttonText}>Cone Separation: </Text>
//           <TextInput
//             style={styles.textInput}
//             onChangeText={setConeSeperation}
//             onSubmitEditing={onSubmitSeperation}
//             value={coneSeperation.toString()}
//             defaultValue="1"
//             keyboardType="numeric"
//           />
//           <Text style={styles.buttonText}>m</Text>
//         </View>
//       </View>
//       <View style={styles.centered}>
//         <Pressable style={styles.realignButton} onPressIn={() => handlePress(6)}>
//           <Text style={styles.buttonText}>Realign Cones</Text>
//           <View style={[styles.dot, { backgroundColor: dotColor }]} />
//         </Pressable>
//         <View style={styles.dPadContainer}>
//           <Pressable
//             style={[styles.buttonContainer, styles.upButton]}
//             onPressIn={() => handlePress(1)}
//             onPressOut={handleRelease}
//           >
//             <Text style={styles.buttonText}>Forward</Text>
//           </Pressable>
//           <View style={styles.middleRow}>
//             <Pressable
//               style={[styles.buttonContainer, styles.leftButton]}
//               onPressIn={() => handlePress(2)}
//               onPressOut={handleRelease}
//             >
//               <Text style={styles.buttonText}>Left</Text>
//             </Pressable>
//             <Pressable
//               style={[styles.buttonContainer, styles.rightButton]}
//               onPressIn={() => handlePress(3)}
//               onPressOut={handleRelease}
//             >
//               <Text style={styles.buttonText}>Right</Text>
//             </Pressable>
//           </View>
//           <Pressable
//             style={[styles.buttonContainer, styles.downButton]}
//             onPressIn={() => handlePress(4)}
//             onPressOut={handleRelease}
//           >
//             <Text style={styles.buttonText}>Back</Text>
//           </Pressable>
//         </View>
//       </View>
//       <StatusBar style="auto" />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#1c1c1e',
//     alignItems: 'center',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   connectionStatus: {
//     color: '#00ffff',
//     fontSize: 20,
//     fontFamily: 'Courier', 
//     marginBottom: 20,
//     textAlign: 'center',
//     backgroundColor: '#333',
//     padding: 10,
//     borderRadius: 5,
//     width: '90%',
//   },
//   topRight: {
//     position: 'absolute',
//     top: 50,
//     right: 20,
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#444',
//     borderRadius: 5,
//     padding: 10,
//   },
//   textInput: {
//     color: '#00ffff',
//     backgroundColor: '#222',
//     padding: 5,
//     borderRadius: 3,
//     marginHorizontal: 5,
//     textAlign: 'center',
//     width: 40,
//   },
//   centered: {
//     alignItems: 'center',
//   },
//   realignButton: {
//     alignItems: 'center',
//     backgroundColor: '#ff4500',
//     borderRadius: 5,
//     marginBottom: 20,
//     padding: 10,
//     width: 200,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   dPadContainer: {
//     width: 250,
//     height: 250,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#333',
//     borderRadius: 125,
//     padding: 10,
//   },
//   middleRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     marginVertical: 5,
//   },
//   buttonContainer: {
//     alignItems: 'center',
//     backgroundColor: '#ff4500',
//     borderRadius: 15,
//     padding: 15,
//     margin: 5,
//     width: 85,
//     height: 85,
//     justifyContent: 'center',
//   },
//   upButton: {
//     position: 'absolute',
//     top: 0,
//     left: '50%',
//     marginLeft: -35,
//   },
//   downButton: {
//     position: 'absolute',
//     bottom: 0,
//     left: '50%',
//     marginLeft: -35,
//   },
//   leftButton: {
//     position: 'absolute',
//     left: 0,
//     top: '50%',
//     marginTop: -40,
//   },
//   rightButton: {
//     position: 'absolute',
//     right: 0,
//     top: '50%',
//     marginTop: -40,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   dot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     position: 'absolute',
//     right: 10,
//     top: 10,
//   },
//   rightAligned: {
//     position: 'absolute',
//     right: 20,
//     top: '50%',
//     transform: [{ translateY: -20 }], // Center vertically
//   },
// });

return (
  <View style={styles.container}>
    <Text style={styles.connectionStatus}>{"Connected"}</Text>

    {/* Dropdown Button */}
    <View style={styles.rightAligned}>
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
            onPressIn={() => handlePress(3)}
            onPressOut={handleRelease}
          >
            <Text style={styles.buttonText}>Right</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.buttonContainer, styles.downButton]}
          onPressIn={() => handlePress(4)}
          onPressOut={handleRelease}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
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