import { PermissionsAndroid } from "react-native";

export default function useBLE() {
    return requestPermissions = async () => {
        const grantedStatus = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
                title: 'Location Permission',
                message: 'Bluetooth Low Energy Needs Location Permission',
                buttonNegative: 'Cancel',
                buttonPostitive: 'Ok',
                buttonNeutral: 'Maybe Later',
            },
        );
        callback(grantedStatus === PermissionsAndroid.RESULTS.GRANTED);
    }
}