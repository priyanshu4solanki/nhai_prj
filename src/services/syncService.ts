const SYNC_SERVER_URL = 'http://localhost:3000';

import {
  getPendingSyncEmployees,
  markEmployeeAsSynced,
  getPendingSyncRecords,
  markRecordAsSynced,
  insertOrUpdateEmployee,
  insertSyncedAttendance,
} from './databaseService';
import { checkInternetConnectivity } from '../utils';

export const runBackgroundSync = async (): Promise<{
  success: boolean;
  uploadedEmployees: number;
  uploadedAttendance: number;
  downloadedEmployees: number;
  downloadedAttendance: number;
  error?: string;
}> => {
  const online = await checkInternetConnectivity();
  if (!online) {
    return {
      success: false,
      uploadedEmployees: 0,
      uploadedAttendance: 0,
      downloadedEmployees: 0,
      downloadedAttendance: 0,
      error: 'Device is offline.',
    };
  }

  const targetUrl = SYNC_SERVER_URL.trim().replace(/\/$/, '');

  let uploadedEmployees = 0;
  let uploadedAttendance = 0;
  let downloadedEmployees = 0;
  let downloadedAttendance = 0;

  try {
    // 1. Upload Unsynced Employees
    const pendingEmps = await getPendingSyncEmployees();
    if (pendingEmps.length > 0) {
      const response = await fetch(`${targetUrl}/api/sync/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingEmps),
      });

      if (response.ok) {
        for (const emp of pendingEmps) {
          await markEmployeeAsSynced(emp.id);
          uploadedEmployees++;
        }
      } else {
        throw new Error(`Failed to upload employees: status ${response.status}`);
      }
    }

    // 2. Upload Unsynced Attendance Records
    const pendingRecords = await getPendingSyncRecords();
    if (pendingRecords.length > 0) {
      const response = await fetch(`${targetUrl}/api/sync/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingRecords),
      });

      if (response.ok) {
        for (const record of pendingRecords) {
          await markRecordAsSynced(record.uuid);
          uploadedAttendance++;
        }
      } else {
        throw new Error(`Failed to upload attendance: status ${response.status}`);
      }
    }

    // 3. Download Master Employees List
    const empRes = await fetch(`${targetUrl}/api/sync/employees`);
    if (empRes.ok) {
      const serverEmployees = await empRes.json();
      for (const emp of serverEmployees) {
        const result = await insertOrUpdateEmployee({
          id: emp.id,
          name: emp.name,
          department: emp.department,
          photoPath: emp.photo_path || emp.photoPath,
          faceVector: emp.faceVector || (emp.face_vector ? (typeof emp.face_vector === 'string' ? JSON.parse(emp.face_vector) : emp.face_vector) : null),
          createdAt: emp.created_at || emp.createdAt,
          updatedAt: emp.updated_at || emp.updatedAt,
        }, 1); // Set synced=1
        if (result.success) {
          downloadedEmployees++;
        }
      }
    }

    // 4. Download Master Attendance Records
    const attRes = await fetch(`${targetUrl}/api/sync/attendance`);
    if (attRes.ok) {
      const serverAttendance = await attRes.json();
      for (const record of serverAttendance) {
        const result = await insertSyncedAttendance(record);
        if (result.success) {
          downloadedAttendance++;
        }
      }
    }

    return {
      success: true,
      uploadedEmployees,
      uploadedAttendance,
      downloadedEmployees,
      downloadedAttendance,
    };
  } catch (err: any) {
    console.log('Background sync execution error:', err);
    return {
      success: false,
      uploadedEmployees,
      uploadedAttendance,
      downloadedEmployees,
      downloadedAttendance,
      error: err?.message || err?.toString() || 'Unknown sync error',
    };
  }
};
