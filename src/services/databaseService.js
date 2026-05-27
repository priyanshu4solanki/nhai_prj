import SQLite from 'react-native-sqlite-storage';

// Enable Promise support
SQLite.enablePromise(true);

let db = null;

/* =========================
   INITIALIZE DATABASE
========================= */
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

/* =========================
   CREATE TABLES
========================= */
const createTables = async () => {
  if (!db) return;

  // Employees Table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE,
      name TEXT,
      department TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Attendance Table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT,
      timestamp TEXT,
      sync_status INTEGER
    );
  `);

  console.log('Employees + Attendance Tables Created');
};

/* =========================
   INSERT EMPLOYEE
========================= */
export const addEmployee = async (employee_id, name, department) => {
  try {
    await db.executeSql(
      `INSERT INTO employees (employee_id, name, department)
       VALUES (?, ?, ?)`,
      [employee_id, name, department]
    );

    console.log('Employee Inserted');
    return true;

  } catch (error) {
    console.log('Insert Employee Error:', error);
    return false;
  }
};

/* =========================
   MARK ATTENDANCE
========================= */
export const markAttendance = async (employee_id) => {
  try {
    const timestamp = new Date().toISOString();

    await db.executeSql(
      `INSERT INTO attendance (employee_id, timestamp, sync_status)
       VALUES (?, ?, ?)`,
      [employee_id, timestamp, 0]
    );

    console.log('Attendance Marked');
    return true;

  } catch (error) {
    console.log('Attendance Error:', error);
    return false;
  }
};

/* =========================
   GET DATABASE INSTANCE
========================= */
export const getDatabase = () => db;