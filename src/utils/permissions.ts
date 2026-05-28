import { PermissionsAndroid, Platform } from 'react-native';
import { CameraPermissionStatus } from '../types';

export const requestCameraPermission = async (): Promise<CameraPermissionStatus> => {
  try {
    if (Platform.OS === 'android') {
      const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
      const result = await PermissionsAndroid.request(permission, {
        title: 'Camera Permission',
        message: 'This app needs access to your camera for face recognition.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      return {
        granted: result === PermissionsAndroid.RESULTS.GRANTED,
        reason: result === PermissionsAndroid.RESULTS.GRANTED ? undefined : 'Permission denied',
      };
    }

    // iOS will be handled differently in future
    return {
      granted: true,
      reason: 'iOS will require Info.plist configuration',
    };
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return {
      granted: false,
      reason: 'Error requesting permission',
    };
  }
};

export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
      const result = await PermissionsAndroid.check(permission);
      return result;
    }
    return true;
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return false;
  }
};

export const requestStoragePermission = async (): Promise<CameraPermissionStatus> => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 30) {
        // Android 11+ requires MANAGE_EXTERNAL_STORAGE
        const permission = PermissionsAndroid.PERMISSIONS.MANAGE_EXTERNAL_STORAGE;
        const result = await PermissionsAndroid.request(permission);
        return {
          granted: result === PermissionsAndroid.RESULTS.GRANTED,
        };
      } else {
        // Android 6-10 requires READ_EXTERNAL_STORAGE and WRITE_EXTERNAL_STORAGE
        const permissions = [
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];
        const result = await PermissionsAndroid.requestMultiple(permissions);
        const granted = Object.values(result).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
        return { granted };
      }
    }
    return { granted: true };
  } catch (error) {
    console.error('Error requesting storage permission:', error);
    return { granted: false };
  }
};
