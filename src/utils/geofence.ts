import {GEOFENCE} from '../constants/geofence';
import {
  insertAttendanceRecord,
  getActiveSession,
  startSession,
  endSession,
  getAllSites,
} from '../services/databaseService';
import {generateUUID, getCurrentTimestamp} from './helpers';

type Coords = {
  latitude: number;
  longitude: number;
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371000; // Earth radius meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

import Geolocation from '@react-native-community/geolocation';

const getCurrentLocation = (): Promise<Coords> => {
  return new Promise(resolve => {
    try {
      console.log(
        'Requesting current position via @react-native-community/geolocation...',
      );
      Geolocation.getCurrentPosition(
        (pos: any) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          console.log('Got position successfully:', coords);
          resolve(coords);
        },
        (err: any) => {
          console.log('Geolocation error:', err?.code, err?.message);
          console.log('Using geofence coordinates as offline fallback');
          // On error, use geofence coordinates as fallback
          resolve({
            latitude: GEOFENCE.latitude,
            longitude: GEOFENCE.longitude,
          });
        },
        {enableHighAccuracy: true, timeout: 10000, maximumAge: 5000},
      );
    } catch (error) {
      console.log('Error in getCurrentLocation:', error);
      // Fallback to geofence coordinates
      resolve({
        latitude: GEOFENCE.latitude,
        longitude: GEOFENCE.longitude,
      });
    }
  });
};

const isCoordsInsideSite = (coords: Coords, site: any): boolean => {
  const siteLat = Number(site.latitude);
  const siteLon = Number(site.longitude);
  const siteRadius = Number(site.radius);

  if (isNaN(siteLat) || isNaN(siteLon) || isNaN(siteRadius)) {
    return false;
  }

  if (site.geofence_type === 'square') {
    const metersPerDegreeLat = 111111;
    const metersPerDegreeLon = 111111 * Math.cos((siteLat * Math.PI) / 180);

    const latDelta = siteRadius / metersPerDegreeLat;
    const lonDelta = siteRadius / metersPerDegreeLon;

    const minLat = siteLat - latDelta;
    const maxLat = siteLat + latDelta;
    const minLon = siteLon - lonDelta;
    const maxLon = siteLon + lonDelta;

    return (
      coords.latitude >= minLat &&
      coords.latitude <= maxLat &&
      coords.longitude >= minLon &&
      coords.longitude <= maxLon
    );
  } else {
    // Default to Circular
    const dist = haversineDistanceMeters(
      coords.latitude,
      coords.longitude,
      siteLat,
      siteLon,
    );
    return dist <= siteRadius;
  }
};

export const isInsideGeofence = async (coords: Coords): Promise<boolean> => {
  try {
    const sites = await getAllSites();
    for (const site of sites) {
      if (isCoordsInsideSite(coords, site)) {
        return true;
      }
    }
  } catch (err) {
    console.log('Error in isInsideGeofence check:', err);
  }

  // Fallback to static config geofence
  const dist = haversineDistanceMeters(
    coords.latitude,
    coords.longitude,
    GEOFENCE.latitude,
    GEOFENCE.longitude,
  );
  return dist <= (GEOFENCE.radiusMeters || 0);
};

export const attemptGeoAttendance = async (
  employeeId: string,
  department?: string,
) => {
  console.log('Attempting geo attendance for:', employeeId);

  let coords = null;
  let gpsFailed = false;

  try {
    // Try to get location (with or without permission)
    coords = await getCurrentLocation();
    console.log('Location acquired:', coords);

    // Check if we got geofence fallback (Delhi HQ coordinates)
    if (
      coords.latitude === GEOFENCE.latitude &&
      coords.longitude === GEOFENCE.longitude
    ) {
      gpsFailed = true;
      console.log(
        'GPS fallback triggered (Delhi NHAI HQ coordinates returned)',
      );
    }
  } catch (error) {
    console.log('Location error:', error);
    gpsFailed = true;
  }

  // Detect which site the user is at
  let matchedSite = null;
  let nearestSiteInfo = '';

  if (!gpsFailed && coords) {
    try {
      const sites = await getAllSites();
      let minDistance = Infinity;
      let closestSite = null;

      for (const site of sites) {
        const isInside = isCoordsInsideSite(coords, site);

        const dist = haversineDistanceMeters(
          coords.latitude,
          coords.longitude,
          Number(site.latitude),
          Number(site.longitude),
        );

        if (dist < minDistance) {
          minDistance = dist;
          closestSite = site;
        }

        if (isInside) {
          matchedSite = site;
          break;
        }
      }

      if (!matchedSite && closestSite) {
        const distMeters = Math.round(minDistance);
        let distStr = `${distMeters}m`;
        if (distMeters >= 1000) {
          distStr = `${(distMeters / 1000).toFixed(1)} km`;
        }
        nearestSiteInfo = `${distStr} away from ${closestSite.site_name}`;
      }
    } catch (err) {
      console.log('Error querying sites for geofencing match:', err);
    }
  }

  const siteId = matchedSite ? matchedSite.site_id : null;

  let locationLabel = '';
  let siteName = '';

  if (gpsFailed) {
    locationLabel = 'Unable to fetch location';
    siteName = 'Unable to fetch location';
  } else if (matchedSite) {
    locationLabel = matchedSite.site_name;
    siteName = matchedSite.site_name;
  } else {
    // Outside geofence
    if (nearestSiteInfo) {
      locationLabel = `Outside Geofence (${nearestSiteInfo})`;
      siteName = `Outside Geofence (${nearestSiteInfo})`;
    } else {
      locationLabel = 'Outside Geofence';
      siteName = 'Outside Geofence';
    }
  }

  // Determine if this is a check-in or check-out
  const activeSession = await getActiveSession(employeeId);
  const timestamp = getCurrentTimestamp();

  if (!activeSession) {
    // Check-in
    console.log('Performing check-in at site:', siteName);

    const attendanceLog = {
      uuid: generateUUID(),
      employeeId,
      department: department || null,
      timestamp,
      checkType: 'check-in',
      location: locationLabel,
      faceConfidence: 0,
      livenessConfidence: 0,
      recognitionConfidence: 0,
      siteId,
      duration: 0,
    };

    const result = await insertAttendanceRecord(attendanceLog);
    console.log('Attendance insert result:', result);
    await startSession(employeeId, department || null, siteId);

    return {success: true, action: 'check-in', timestamp, coords, siteName};
  }

  // Check-out
  console.log('Performing check-out from site:', siteName);
  const durationMs = timestamp - (activeSession.start_time || timestamp);

  const attendanceLog = {
    uuid: generateUUID(),
    employeeId,
    department: department || activeSession.department || null,
    timestamp,
    checkType: 'check-out',
    location: locationLabel,
    faceConfidence: 0,
    livenessConfidence: 0,
    recognitionConfidence: 0,
    siteId: siteId || activeSession.site_id || null,
    duration: durationMs,
  };

  const result = await insertAttendanceRecord(attendanceLog);
  console.log('Attendance insert result:', result);
  await endSession(employeeId);

  return {
    success: true,
    action: 'check-out',
    timestamp,
    coords,
    durationMs,
    siteName,
  };
};

export default {
  isInsideGeofence,
  attemptGeoAttendance,
};
