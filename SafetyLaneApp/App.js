import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Pressable, Button, TextInput } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { useState, useEffect, useRef } from "react";
import { btoa, atob } from "react-native-quick-base64";

const bleManager = new BleManager();

// Android Bluetooth Permission for location, may not be needed, if not remove permissions from AndroidManifest.xml

//TODO: There is a bug where the device attempts to reconnect while already connected, and it detects a duplicate connection but keeps trying to connect anyway. Implement handling for this

const SERVICE_UUID = "137f26d4-af6f-40cd-bccd-1dcf833c71d0";
const CHARACTERISTIC_UUID = "b06c0815-ebc6-43a3-ac68-025c7dd0ee77";


export default function App() {
  const [deviceID, setDeviceID] = useState(null);
  const [coneSeperation, setConeSeperation] = useState(1);
  // const [distance, setDistance] = useState(0); //Distance is used as a dummy variable for data received by esp32. Uncomment this and write characteristic data inside the arduino code to restore this functionality, examine previous commits if confusing
  const [dataCharacteristic, setDataCharacteristic] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("searching...");
  const [connected, setConnected] = useState(false);
  const [permissions, setPermissions] = useState(false);
  const [dotColor, setDotColor] = useState("transparent");
  
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
  
  async function requestPermissions() {
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
  requestPermissions();

  const searchAndConnectToDevice = () => {
    console.log("scan start")
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log("errored out")
        console.log(device)
        console.error(error);
        setConnectionStatus("Error searching for devices");
        return;
      }
      if (device.name === "SafetyLaneApp") {
        bleManager.stopDeviceScan();
        setConnectionStatus("Connecting...");
        setConnected(true);
        console.log("connected to ", device)
        connectToDevice(device);
      }
    });
  };
  async function sendData(value) {
    // setDistance(distance + 1);
    console.log("new value ====", value);
    try {
      console.log("deviceid", deviceID);
      console.log("service uuid", SERVICE_UUID);
      console.log("service uuid", CHARACTERISTIC_UUID);
      encodedData = btoa(value.toString());

    bleManager.writeCharacteristicWithResponseForDevice(
      deviceID,
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      encodedData
    ).then(characteristic => {
      console.log('value changed to ', characteristic.value)
    })
  } catch (err) {
    console.log("Error: ", err)
  }
};

  function handlePress(value) {
    console.log("bressable Pressed Down ", value);
    sendData(value);
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

  const deviceRef = useRef(null);


  useEffect(() => {
    console.log("inside of useeffect")
    if (permissions) {
      searchAndConnectToDevice();
      // while (connectionStatus == "Error searching for devices") {
      //   console.log("inside while, second run")
      //   searchAndConnectToDevice();
      // }
    }}, [permissions]);

  const connectToDevice = (device) => {
    console.log("connect start")
    return device
      .connect()
      .then((device) => {
        setDeviceID(device.id);
        setConnectionStatus("Connected");
        deviceRef.current = device;
        console.log("connect discovering services")
        return device.discoverAllServicesAndCharacteristics();
      })
      .then((device) => {
        console.log("connect returning services")
        return device.services();
      })
      .then((services) => {
        let service = services.find((service) => service.uuid === SERVICE_UUID);
        console.log("connect getting characteristics")
        return service.characteristics();
      })
      .then((characteristics) => {
        let characteristic = characteristics.find(
          (char) => char.uuid === CHARACTERISTIC_UUID
        );
        console.log("finding data char uuid of", CHARACTERISTIC_UUID)
        setDataCharacteristic(characteristic);
        characteristic.monitor((error, char) => {
          if (error) {
            console.error(error);
            return;
          }
          const rawData = atob(char.value);
          console.log("Received data:", rawData);
          // setDistance(rawData);
        });
      })
      .catch((error) => {
        console.log("Connection error below ===============================");
        console.log(error);
        setConnectionStatus("Error in Connection");
      });
  };


  useEffect(() => {
    const subscription = bleManager.onDeviceDisconnected(
      deviceID,
      (error, device) => {
        if (error) {
          console.log("Disconnected with error:", error);
        }
        setConnectionStatus("Disconnected");
        console.log("Disconnected device");
        if (deviceRef.current) {
          setConnectionStatus("Reconnecting...");
          connectToDevice(deviceRef.current)
            .then(() => setConnectionStatus("Connected"))
            .catch((error) => {
              console.log("Reconnection failed: ", error);
              setConnectionStatus("Reconnection failed");
            });
        }
      }
    );
    return () => subscription.remove();
  }, [deviceID]);

  return (

    <View style={styles.container}>
      <Text style={styles.connectionStatus}>{connectionStatus}</Text>
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
      <View style={styles.centered}>
        <Pressable style={styles.realignButton} onPressIn={() => handlePress(6)}>
          <Text style={styles.buttonText}>Realign Cones</Text>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        </Pressable>
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
  );
}





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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    right: 10,
    top: 10,
  },
});