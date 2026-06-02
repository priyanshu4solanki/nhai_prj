import { GEOFENCE } from '../constants/geofence';
import { requestLocationPermission } from './permissions';
import {
  insertAttendanceRecord,
  getActiveSession,
  startSession,
  endSession,
} from '../services/databaseService';
import { generateUUID, getCurrentTimestamp } from './helpers';

type Coords = {
  latitude: number;
  longitude: number;
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const haversineDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000; // Earth radius meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getCurrentLocation = (): Promise<Coords> => {
  return new Promise((resolve, reject) => {
    try {
      const maybeGeo = (global as any).navigator?.geolocation || (global as any).geolocation;
      if (!maybeGeo || typeof maybeGeo.getCurrentPosition !== 'function') {
        return reject(new Error('Geolocation not available'));
      }

      maybeGeo.getCurrentPosition(
        (pos: any) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err: any) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
    } catch (error) {
      reject(error);
    }
  });
};

export const isInsideGeofence = (coords: Coords): boolean => {
  const dist = haversineDistanceMeters(
    coords.latitude,
    coords.longitude,
    GEOFENCE.latitude,
    GEOFENCE.longitude
  );
  return dist <= (GEOFENCE.radiusMeters || 0);
};

export const attemptGeoAttendance = async (employeeId: string, department?: string) => {
  // Request permission first
  const perm = await requestLocationPermission();
  if (!perm.granted) return { success: false, reason: 'permission_denied' };

  let coords;
  try {
    coords = await getCurrentLocation();
  } catch (error) {
    return { success: false, reason: 'location_error', error };
  }

  const inside = isInsideGeofence(coords);
  if (!inside) return { success: false, reason: 'outside_geofence', coords };

  // Determine if this is a check-in or check-out
  const activeSession = await getActiveSession(employeeId);
  const timestamp = getCurrentTimestamp();

  if (!activeSession) {
    // Check-in
    const attendanceLog = {
      uuid: generateUUID(),
      employeeId,
      department: department || null,
      timestamp,
      checkType: 'check-in',
      location: `Lat:${coords.latitude.toFixed(6)},Lon:${coords.longitude.toFixed(6)}`,
      faceConfidence: 0,
      livenessConfidence: 0,
      recognitionConfidence: 0,
    };

    await insertAttendanceRecord(attendanceLog);
    await startSession(employeeId, department || null);

    return { success: true, action: 'check-in', timestamp, coords };
  }

  // Check-out
  const attendanceLog = {
    uuid: generateUUID(),
    employeeId,
    department: department || activeSession.department || null,
    timestamp,
    checkType: 'check-out',
    location: `Lat:${coords.latitude.toFixed(6)},Lon:${coords.longitude.toFixed(6)}`,
    faceConfidence: 0,
    livenessConfidence: 0,
    recognitionConfidence: 0,
  };

  await insertAttendanceRecord(attendanceLog);
  await endSession(employeeId);

  const durationMs = timestamp - (activeSession.start_time || timestamp);

  return { success: true, action: 'check-out', timestamp, coords, durationMs };
};

export default {
  isInsideGeofence,
  attemptGeoAttendance,
};
