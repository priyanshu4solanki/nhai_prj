import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db = null;

// Database initialization
export const initializeDatabase = async () => {
  try {
    db = await SQLite.openDatabase({
      name: 'nhai_attendance.db',
      location: 'default',
    });

    console.log('Database Opened');

    await createTables();

    return {
      success: true,
      message: 'Database initialized successfully',
    };
  } catch (error) {
    console.log('Database Error:', error);
    return {
      success: false,
      error,
    };
  }
};

const createTables = async () => {
  if (!db) return;

  try {
    // Attendance records table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE,
        employee_id TEXT NOT NULL,
        department TEXT,
        timestamp INTEGER,
        check_type TEXT,
        location TEXT,
        verified INTEGER DEFAULT 1,
        synced INTEGER DEFAULT 0,
        face_confidence REAL,
        liveness_confidence REAL,
        recognition_confidence REAL,
        created_at INTEGER,
        synced_at INTEGER
      );
    `);

    // Employee records table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT,
        department TEXT,
        photo_path TEXT,
        face_vector BLOB,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // Session management table
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        department TEXT,
        start_time INTEGER,
        end_time INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER
      );
    `);

    // Sync queue table for pending records
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attendance_id TEXT UNIQUE,
        employee_id TEXT,
        timestamp INTEGER,
        status TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at INTEGER,
        last_retry_at INTEGER
      );
    `);

    // Indexes for better query performance
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_employee_id ON attendance(employee_id);');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_timestamp ON attendance(timestamp);');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_synced ON attendance(synced);');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_session_employee ON sessions(employee_id);');

    console.log('All tables created successfully');
  } catch (error) {
    console.log('Error creating tables:', error);
  }
};

// Attendance operations
export const insertAttendanceRecord = async (record) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    const {
      uuid,
      employeeId,
      department,
      timestamp,
      checkType,
      location,
      faceConfidence,
      livenessConfidence,
      recognitionConfidence,
    } = record;

    await db.executeSql(
      `INSERT INTO attendance (
        uuid, employee_id, department, timestamp, check_type, location, 
        verified, synced, face_confidence, liveness_confidence, 
        recognition_confidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        employeeId,
        department,
        timestamp,
        checkType,
        location || null,
        1,
        0, // Not synced yet
        faceConfidence || 0,
        livenessConfidence || 0,
        recognitionConfidence || 0,
        Date.now(),
      ]
    );

    return { success: true, message: 'Attendance recorded' };
  } catch (error) {
    console.log('Error inserting attendance:', error);
    return { success: false, error };
  }
};

export const getAttendanceRecords = async (employeeId, limit = 100) => {
  if (!db) return [];

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM attendance WHERE employee_id = ? ORDER BY timestamp DESC LIMIT ?',
      [employeeId, limit]
    );

    return result.rows._array || [];
  } catch (error) {
    console.log('Error fetching attendance records:', error);
    return [];
  }
};

export const getPendingSyncRecords = async () => {
  if (!db) return [];

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM attendance WHERE synced = 0 ORDER BY created_at ASC'
    );

    return result.rows._array || [];
  } catch (error) {
    console.log('Error fetching pending records:', error);
    return [];
  }
};

export const markRecordAsSynced = async (recordUuid) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql(
      'UPDATE attendance SET synced = 1, synced_at = ? WHERE uuid = ?',
      [Date.now(), recordUuid]
    );

    return { success: true };
  } catch (error) {
    console.log('Error marking record as synced:', error);
    return { success: false, error };
  }
};

export const deleteAttendanceRecord = async (recordUuid) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql('DELETE FROM attendance WHERE uuid = ?', [recordUuid]);
    return { success: true };
  } catch (error) {
    console.log('Error deleting attendance record:', error);
    return { success: false, error };
  }
};

// Employee operations
export const insertOrUpdateEmployee = async (employee) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    const { id, name, department, photoPath, faceVector } = employee;

    await db.executeSql(
      `INSERT OR REPLACE INTO employees (
        id, name, department, photo_path, face_vector, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        department,
        photoPath || null,
        faceVector ? Buffer.from(faceVector).toString('base64') : null,
        Date.now(),
        Date.now(),
      ]
    );

    return { success: true };
  } catch (error) {
    console.log('Error saving employee:', error);
    return { success: false, error };
  }
};

export const getEmployee = async (employeeId) => {
  if (!db) return null;

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );

    if (result.rows.length > 0) {
      const employee = result.rows._array[0];
      // Decode face vector if present
      if (employee.face_vector) {
        employee.faceVector = Array.from(
          new Float32Array(Buffer.from(employee.face_vector, 'base64').buffer)
        );
      }
      return employee;
    }

    return null;
  } catch (error) {
    console.log('Error fetching employee:', error);
    return null;
  }
};

// Session operations
export const startSession = async (employeeId, department) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql(
      `INSERT INTO sessions (
        employee_id, department, start_time, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [employeeId, department, Date.now(), 1, Date.now()]
    );

    return { success: true };
  } catch (error) {
    console.log('Error starting session:', error);
    return { success: false, error };
  }
};

export const endSession = async (employeeId) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql(
      'UPDATE sessions SET is_active = 0, end_time = ? WHERE employee_id = ? AND is_active = 1',
      [Date.now(), employeeId]
    );

    return { success: true };
  } catch (error) {
    console.log('Error ending session:', error);
    return { success: false, error };
  }
};

export const getActiveSession = async (employeeId) => {
  if (!db) return null;

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM sessions WHERE employee_id = ? AND is_active = 1',
      [employeeId]
    );

    return result.rows.length > 0 ? result.rows._array[0] : null;
  } catch (error) {
    console.log('Error fetching active session:', error);
    return null;
  }
};

// Sync operations
export const addToSyncQueue = async (attendanceRecord) => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql(
      `INSERT INTO sync_queue (
        attendance_id, employee_id, timestamp, status, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [attendanceRecord.uuid, attendanceRecord.employee_id, Date.now(), 'pending', Date.now()]
    );

    return { success: true };
  } catch (error) {
    console.log('Error adding to sync queue:', error);
    return { success: false, error };
  }
};

export const getSyncQueueSize = async () => {
  if (!db) return 0;

  try {
    const [result] = await db.executeSql(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'"
    );

    return result.rows._array[0]?.count || 0;
  } catch (error) {
    console.log('Error getting sync queue size:', error);
    return 0;
  }
};

export const clearSyncQueue = async () => {
  if (!db) return { success: false, error: 'Database not initialized' };

  try {
    await db.executeSql("UPDATE sync_queue SET status = 'completed' WHERE status = 'pending'");
    await db.executeSql('DELETE FROM sync_queue WHERE status = "completed"');

    return { success: true };
  } catch (error) {
    console.log('Error clearing sync queue:', error);
    return { success: false, error };
  }
};

export const getDatabase = () => db;