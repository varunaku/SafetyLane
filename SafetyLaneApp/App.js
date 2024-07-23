import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Button } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { useState, useEffect, useRef } from "react";
import { btoa, atob } from "react-native-quick-base64";
import base64 from "react-native-quick-base64";

const bleManager = new BleManager();

// Android Bluetooth Permission for location, may not be needed, if not remove permissions from AndroidManifest.xml

//uuids at 20:40 in video
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const STEP_DATA_CHAR_UUID = "beefcafe-36e1-4688-b7f5-00000000000b";


export default function App() {
  const [deviceID, setDeviceID] = useState(null);
  const [distance, setDistance] = useState(0);
  const [stepDataChar, setStepDataChar] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("searching...");
  const [connected, setConnected] = useState(false);
  const [permissions, setPermissions] = useState(false);

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
  async function sendData() {
    setDistance(distance + 1);
    console.log("new distance ====", distance);
    try {
      console.log("deviceid", deviceID);
      console.log("service uuid", SERVICE_UUID);
      console.log("service uuid", STEP_DATA_CHAR_UUID);
      encodedData = btoa(distance.toString());

    bleManager.writeCharacteristicWithResponseForDevice(
      deviceID,
      SERVICE_UUID,
      STEP_DATA_CHAR_UUID,
      encodedData
    ).then(characteristic => {
      console.log('value changed to ', btoa(characteristic.value))
    })
  } catch (err) {
    console.log("Error: ", err)
  }
};

  // console.log("past permisisons");
  // searchAndConnectToDevice();
  // console.log("tried search");


  // while(connected ) {
  //   console.log("inside of while")
  //   searchAndConnectToDevice();
  // }

  const deviceRef = useRef(null);


  useEffect(() => {
    console.log("inside of useeffect")
    if (permissions) {
      searchAndConnectToDevice();
    }
    // requestLocationPermission();
    // requestPermissions();

    }, [permissions]);
  // const connectToDevice = (device) => {
  //   console.log("MADE IT INTO CONNECT TO DEVICE!");
  // }

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
        let stepDataCharacteristic = characteristics.find(
          (char) => char.uuid === STEP_DATA_CHAR_UUID
        );
        console.log("finding step data char uuid of", STEP_DATA_CHAR_UUID)
        setStepDataChar(stepDataCharacteristic);
        stepDataCharacteristic.monitor((error, char) => {
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
        setDistance(0); // Reset the step count
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
      <Text>testtestest!</Text>
      <Text>{distance}</Text>
      <Text>{connectionStatus}</Text>
      <Button
        onPress={sendData}
        title="Increment Distance"
        color="#841584"
      />
      <StatusBar style="auto" />
    </View>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});