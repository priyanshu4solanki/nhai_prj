import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db = null;

// Helper to extract rows safely across all React Native SQLite platforms
const extractRows = result => {
  if (!result || !result.rows) {
    return [];
  }
  if (typeof result.rows.raw === 'function') {
    return result.rows.raw();
  }
  if (result.rows._array) {
    return result.rows._array;
  }
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

const getTableColumns = async tableName => {
  if (!db) {
    return [];
  }
  try {
    const [result] = await db.executeSql(`PRAGMA table_info('${tableName}');`);
    const rows = extractRows(result);
    return rows.map(
      row =>
        row.name || row.NAME || (typeof row.name === 'string' ? row.name : ''),
    );
  } catch (error) {
    console.log(`Error getting table columns for ${tableName}:`, error);
    return [];
  }
};

const addColumnIfMissing = async (tableName, columnName, columnDefinition) => {
  const existingColumns = await getTableColumns(tableName);
  console.log(`Columns in ${tableName} before migration:`, existingColumns);
  if (!existingColumns.includes(columnName)) {
    console.log(`Adding missing column ${columnName} to ${tableName}`);
    await db.executeSql(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`,
    );
    const updatedColumns = await getTableColumns(tableName);
    console.log(`Columns in ${tableName} after migration:`, updatedColumns);
    if (!updatedColumns.includes(columnName)) {
      throw new Error(`Failed to add column ${columnName} to ${tableName}`);
    }
  }
};

const tableExists = async tableName => {
  if (!db) {
    return false;
  }
  try {
    const [result] = await db.executeSql(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?;",
      [tableName],
    );
    return extractRows(result).length > 0;
  } catch (error) {
    console.log(`Error checking if table exists ${tableName}:`, error);
    return false;
  }
};

const ensureTableSchema = async (tableName, createSql, requiredColumns) => {
  const exists = await tableExists(tableName);
  if (!exists) {
    await db.executeSql(createSql);
    return;
  }

  const existingColumns = await getTableColumns(tableName);
  const missingColumns = requiredColumns.filter(
    column => !existingColumns.includes(column.name),
  );

  if (missingColumns.length === 0) {
    return;
  }

  console.log(
    `Migrating ${tableName} - missing columns:`,
    missingColumns.map(c => c.name),
  );

  for (const column of missingColumns) {
    await addColumnIfMissing(
      tableName,
      column.name,
      `${column.name} ${column.definition}`,
    );
  }
};

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
  if (!db) {
    return;
  }

  try {
    // Attendance records table
    await ensureTableSchema(
      'attendance',
      `CREATE TABLE IF NOT EXISTS attendance (
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
        synced_at INTEGER,
        site_id TEXT,
        duration INTEGER
      );`,
      [
        {name: 'synced', definition: 'INTEGER DEFAULT 0'},
        {name: 'synced_at', definition: 'INTEGER'},
        {name: 'site_id', definition: 'TEXT'},
        {name: 'duration', definition: 'INTEGER'},
      ],
    );

    // Employee records table
    await ensureTableSchema(
      'employees',
      `CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT,
        department TEXT,
        photo_path TEXT,
        face_vector TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );`,
      [
        {name: 'photo_path', definition: 'TEXT'},
        {name: 'face_vector', definition: 'TEXT'},
        {name: 'created_at', definition: 'INTEGER'},
        {name: 'updated_at', definition: 'INTEGER'},
      ],
    );

    // Session management table
    await ensureTableSchema(
      'sessions',
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        department TEXT,
        start_time INTEGER,
        end_time INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        site_id TEXT
      );`,
      [
        {name: 'department', definition: 'TEXT'},
        {name: 'start_time', definition: 'INTEGER'},
        {name: 'end_time', definition: 'INTEGER'},
        {name: 'is_active', definition: 'INTEGER DEFAULT 1'},
        {name: 'created_at', definition: 'INTEGER'},
        {name: 'site_id', definition: 'TEXT'},
      ],
    );

    // Sites table
    await ensureTableSchema(
      'sites',
      `CREATE TABLE IF NOT EXISTS sites (
        site_id TEXT PRIMARY KEY,
        site_name TEXT,
        latitude REAL,
        longitude REAL,
        radius REAL,
        created_at INTEGER,
        geofence_type TEXT DEFAULT 'circular'
      );`,
      [
        {name: 'created_at', definition: 'INTEGER'},
        {name: 'geofence_type', definition: "TEXT DEFAULT 'circular'"},
      ],
    );

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
    await db.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_employee_id ON attendance(employee_id);',
    );
    await db.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON attendance(timestamp);',
    );
    const attendanceColumnsAfter = await getTableColumns('attendance');
    if (attendanceColumnsAfter.includes('synced')) {
      await db.executeSql(
        'CREATE INDEX IF NOT EXISTS idx_synced ON attendance(synced);',
      );
    }
    await db.executeSql(
      'CREATE INDEX IF NOT EXISTS idx_session_employee ON sessions(employee_id);',
    );

    console.log('All tables created successfully');

    // Seed default employees if none exist
    await seedDefaultEmployees();

    // Seed default sites if none exist
    await seedDefaultSites();

    // Run database self-test on startup to verify read/write capability
    await runSelfTest();
  } catch (error) {
    console.log('Error creating tables:', error);
  }
};

async function runSelfTest() {
  console.log('Running Database Self-Test...');
  if (!db) {
    console.error('Self-Test FAILED: Database not initialized');
    return;
  }
  try {
    // 1. Try writing to employees
    const testEmployee = {
      id: 'TEST-EMP-999',
      name: 'Test Employee',
      department: 'engineering',
      faceVector: Array(128).fill(0),
    };
    const empResult = await insertOrUpdateEmployee(testEmployee);
    console.log('Self-Test: Write employee result:', empResult);

    // 2. Try reading from employees
    const readEmp = await getEmployee('TEST-EMP-999');
    console.log('Self-Test: Read employee result:', readEmp);

    // 3. Clean up test employee
    if (readEmp) {
      await deleteEmployee('TEST-EMP-999');
      console.log('Self-Test: Cleaned up test employee');
    }

    // 4. Try writing to sites
    const testSite = {
      siteId: 'TEST-SITE-999',
      siteName: 'Test Site',
      latitude: 12.34,
      longitude: 56.78,
      radius: 100,
      geofenceType: 'circular',
    };
    const siteResult = await insertSite(testSite);
    console.log('Self-Test: Write site result:', siteResult);

    // 5. Try reading all sites
    const allSites = await getAllSites();
    console.log('Self-Test: Read all sites count:', allSites.length);

    // 6. Clean up test site
    await deleteSite('TEST-SITE-999');
    console.log('Self-Test: Cleaned up test site');

    console.log('Database Self-Test COMPLETED SUCCESSFULLY.');
  } catch (err) {
    console.error('Database Self-Test FAILED with error:', err);
  }
}

// Seed default sites
const seedDefaultSites = async () => {
  try {
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as count FROM sites',
    );
    const rows = extractRows(result);
    const count = rows[0]?.count || 0;

    if (count === 0) {
      console.log('Seeding default sites...');
      const defaultSites = [
        {
          site_id: 'SITE_A',
          site_name: 'Meerut Highway Project',
          latitude: 28.9845,
          longitude: 77.7064,
          radius: 200,
        },
        {
          site_id: 'HQ_OFFICE',
          site_name: 'NHAI HQ Office',
          latitude: 28.5702,
          longitude: 77.2241,
          radius: 200,
        },
      ];

      for (const site of defaultSites) {
        await db.executeSql(
          `INSERT INTO sites (site_id, site_name, latitude, longitude, radius, created_at, geofence_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            site.site_id,
            site.site_name,
            site.latitude,
            site.longitude,
            site.radius,
            Date.now(),
            'circular',
          ],
        );
      }
      console.log('Successfully seeded default sites.');
    }
  } catch (error) {
    console.error('Error seeding default sites:', error);
  }
};

// Seed default employees for immediate offline testing
const seedDefaultEmployees = async () => {
  try {
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as count FROM employees',
    );
    const rows = extractRows(result);
    const count = rows[0]?.count || 0;

    if (count === 0) {
      console.log('Seeding default employees...');

      // Helper to generate deterministic face vectors
      const generateMockVector = seedValue => {
        const vec = [];
        for (let i = 0; i < 128; i++) {
          vec.push(Math.sin(seedValue + i) * 0.1);
        }
        // Normalize
        let mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
        return vec.map(val => (mag > 0 ? val / mag : val));
      };

      const seedData = [
        {
          id: 'NHAI-101',
          name: 'Amit Sharma',
          department: 'engineering',
          vector: generateMockVector(1.0),
        },
        {
          id: 'NHAI-102',
          name: 'Sanjay Verma',
          department: 'operations',
          vector: generateMockVector(2.0),
        },
        {
          id: 'NHAI-103',
          name: 'Priya Patel',
          department: 'admin',
          vector: generateMockVector(3.0),
        },
      ];

      for (const emp of seedData) {
        await db.executeSql(
          `INSERT INTO employees (id, name, department, face_vector, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            emp.id,
            emp.name,
            emp.department,
            JSON.stringify(emp.vector),
            Date.now(),
            Date.now(),
          ],
        );
      }
      console.log('Successfully seeded default employees.');
    }
  } catch (error) {
    console.error('Error seeding default employees:', error);
  }
};

// Attendance operations
export const insertAttendanceRecord = async record => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

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
      siteId,
      duration,
    } = record;

    await db.executeSql(
      `INSERT INTO attendance (
        uuid, employee_id, department, timestamp, check_type, location, 
        verified, synced, face_confidence, liveness_confidence, 
        recognition_confidence, created_at, site_id, duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        siteId || null,
        duration || 0,
      ],
    );

    // Also add to sync queue table
    await addToSyncQueue({
      uuid,
      employee_id: employeeId,
    });

    return {success: true, message: 'Attendance recorded'};
  } catch (error) {
    console.log('Error inserting attendance:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getAttendanceRecords = async (employeeId, limit = 100) => {
  if (!db) {
    return [];
  }

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM attendance WHERE employee_id = ? ORDER BY timestamp DESC LIMIT ?',
      [employeeId, limit],
    );

    return extractRows(result);
  } catch (error) {
    console.log('Error fetching attendance records:', error);
    return [];
  }
};

export const getPendingSyncRecords = async () => {
  if (!db) {
    return [];
  }

  try {
    const [result] = await db.executeSql(
      `SELECT a.*, s.site_name 
       FROM attendance a 
       LEFT JOIN sites s ON a.site_id = s.site_id 
       WHERE a.synced = 0 
       ORDER BY a.created_at ASC`,
    );

    const records = extractRows(result);
    console.log('Pending records from DB:', records);
    return records;
  } catch (error) {
    console.log('Error fetching pending records:', error);
    return [];
  }
};

export const getAllAttendanceRecords = async (limit = 100) => {
  if (!db) {
    return [];
  }

  try {
    const [result] = await db.executeSql(
      `SELECT a.*, s.site_name 
       FROM attendance a 
       LEFT JOIN sites s ON a.site_id = s.site_id 
       ORDER BY a.timestamp DESC LIMIT ?`,
      [limit],
    );

    return extractRows(result);
  } catch (error) {
    console.log('Error fetching all attendance records:', error);
    return [];
  }
};

export const markRecordAsSynced = async recordUuid => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql(
      'UPDATE attendance SET synced = 1, synced_at = ? WHERE uuid = ?',
      [Date.now(), recordUuid],
    );

    // Remove from sync queue
    await db.executeSql('DELETE FROM sync_queue WHERE attendance_id = ?', [
      recordUuid,
    ]);

    return {success: true};
  } catch (error) {
    console.log('Error marking record as synced:', error);
    return {success: false, error};
  }
};

export const deleteAttendanceRecord = async recordUuid => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql('DELETE FROM attendance WHERE uuid = ?', [recordUuid]);
    await db.executeSql('DELETE FROM sync_queue WHERE attendance_id = ?', [
      recordUuid,
    ]);
    return {success: true};
  } catch (error) {
    console.log('Error deleting attendance record:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

// Employee operations
export const insertOrUpdateEmployee = async employee => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    const {id, name, department, photoPath, faceVector} = employee;

    await db.executeSql(
      `INSERT OR REPLACE INTO employees (
        id, name, department, photo_path, face_vector, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        department,
        photoPath || null,
        faceVector ? JSON.stringify(faceVector) : null,
        Date.now(),
        Date.now(),
      ],
    );

    return {success: true};
  } catch (error) {
    console.log('Error saving employee:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getEmployee = async employeeId => {
  if (!db) {
    return null;
  }

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId],
    );

    const rows = extractRows(result);
    if (rows.length > 0) {
      const employee = rows[0];
      // Decode face vector if present
      if (employee.face_vector) {
        try {
          employee.faceVector = JSON.parse(employee.face_vector);
        } catch (e) {
          console.log('Error parsing face vector JSON:', e);
        }
      }
      return employee;
    }

    return null;
  } catch (error) {
    console.log('Error fetching employee:', error);
    return null;
  }
};

export const getAllEmployees = async () => {
  if (!db) {
    return [];
  }

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM employees ORDER BY name ASC',
    );

    const rows = extractRows(result);
    return rows.map(emp => {
      if (emp.face_vector) {
        try {
          emp.faceVector = JSON.parse(emp.face_vector);
        } catch (e) {
          console.log('Error parsing face vector JSON:', e);
        }
      }
      return emp;
    });
  } catch (error) {
    console.log('Error fetching all employees:', error);
    return [];
  }
};

export const deleteEmployee = async employeeId => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql('DELETE FROM employees WHERE id = ?', [employeeId]);

    return {
      success: true,
      message: `Employee ${employeeId} deleted successfully`,
    };
  } catch (error) {
    console.log('Error deleting employee:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

// Session operations
export const startSession = async (employeeId, department, siteId) => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    // End active session first
    await endSession(employeeId);

    await db.executeSql(
      `INSERT INTO sessions (
        employee_id, department, start_time, is_active, created_at, site_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, department, Date.now(), 1, Date.now(), siteId || null],
    );

    return {success: true};
  } catch (error) {
    console.log('Error starting session:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

// Site operations
export const insertSite = async site => {
  if (!db) {
    return {success: false, error: new Error('Database not initialized')};
  }

  try {
    const {siteId, siteName, latitude, longitude, radius, geofenceType} = site;

    // Self-healing check: verify if geofence_type and created_at columns exist
    try {
      const columns = await getTableColumns('sites');
      if (!columns.includes('geofence_type')) {
        console.log('Self-healing: sites table is missing geofence_type. Altering table...');
        await db.executeSql("ALTER TABLE sites ADD COLUMN geofence_type TEXT DEFAULT 'circular'");
      }
      if (!columns.includes('created_at')) {
        console.log('Self-healing: sites table is missing created_at. Altering table...');
        await db.executeSql("ALTER TABLE sites ADD COLUMN created_at INTEGER");
      }
    } catch (colErr) {
      console.log('Self-healing column check/add error (non-fatal):', colErr);
    }

    await db.executeSql(
      `INSERT OR REPLACE INTO sites (
        site_id, site_name, latitude, longitude, radius, created_at, geofence_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        siteId,
        siteName,
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius),
        Date.now(),
        geofenceType || 'circular',
      ],
    );

    return {success: true};
  } catch (error) {
    console.log('Error saving site:', error);
    try {
      const columns = await getTableColumns('sites');
      console.log('Columns in sites table on insert failure:', columns);
    } catch (colErr) {}
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getAllSites = async () => {
  if (!db) {
    return [];
  }

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM sites ORDER BY site_name ASC',
    );

    return extractRows(result);
  } catch (error) {
    console.log('Error fetching all sites:', error);
    return [];
  }
};

export const deleteSite = async siteId => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql('DELETE FROM sites WHERE site_id = ?', [siteId]);

    return {
      success: true,
      message: `Site ${siteId} deleted successfully`,
    };
  } catch (error) {
    console.log('Error deleting site:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const endSession = async employeeId => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql(
      'UPDATE sessions SET is_active = 0, end_time = ? WHERE employee_id = ? AND is_active = 1',
      [Date.now(), employeeId],
    );

    return {success: true};
  } catch (error) {
    console.log('Error ending session:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getActiveSession = async employeeId => {
  if (!db) {
    return null;
  }

  try {
    const [result] = await db.executeSql(
      'SELECT * FROM sessions WHERE employee_id = ? AND is_active = 1',
      [employeeId],
    );

    const rows = extractRows(result);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.log('Error fetching active session:', error);
    return null;
  }
};

// Sync operations
export const addToSyncQueue = async attendanceRecord => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql(
      `INSERT OR REPLACE INTO sync_queue (
        attendance_id, employee_id, timestamp, status, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        attendanceRecord.uuid,
        attendanceRecord.employee_id,
        Date.now(),
        'pending',
        Date.now(),
      ],
    );

    return {success: true};
  } catch (error) {
    console.log('Error adding to sync queue:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getSyncQueueSize = async () => {
  if (!db) {
    return 0;
  }

  try {
    const [result] = await db.executeSql(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'",
    );

    const rows = extractRows(result);
    return rows[0]?.count || 0;
  } catch (error) {
    console.log('Error getting sync queue size:', error);
    return 0;
  }
};

export const clearSyncQueue = async () => {
  if (!db) {
    return {success: false, error: 'Database not initialized'};
  }

  try {
    await db.executeSql(
      "UPDATE sync_queue SET status = 'completed' WHERE status = 'pending'",
    );
    await db.executeSql('DELETE FROM sync_queue WHERE status = "completed"');

    return {success: true};
  } catch (error) {
    console.log('Error clearing sync queue:', error);
    return {success: false, error: error?.message || error?.toString() || error};
  }
};

export const getDatabase = () => db;
