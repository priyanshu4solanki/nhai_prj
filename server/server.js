const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'server_db.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({employees: [], attendance: []}, null, 2),
  );
}

const readDB = () => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB file:', err);
    return {employees: [], attendance: []};
  }
};

const writeDB = data => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`,
  );
  const pathname = parsedUrl.pathname;

  // 1. Status route
  if (pathname === '/' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(
      JSON.stringify({
        status: 'NHAI Datalake 3.0 Sync Server Active',
        active_employees: db.employees.length,
        attendance_records: db.attendance.length,
        timestamp: Date.now(),
      }),
    );
    return;
  }

  // 2. GET /api/sync/employees
  if (pathname === '/api/sync/employees' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(db.employees));
    return;
  }

  // 3. POST /api/sync/employees
  if (pathname === '/api/sync/employees' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const incomingList = Array.isArray(incoming) ? incoming : [incoming];
        const db = readDB();

        let added = 0;
        let updated = 0;

        incomingList.forEach(emp => {
          if (!emp.id) {
            return;
          }
          const idx = db.employees.findIndex(e => e.id === emp.id);
          if (idx > -1) {
            // Merge/update
            db.employees[idx] = {...db.employees[idx], ...emp, synced: 1};
            updated++;
          } else {
            // Add new
            db.employees.push({...emp, synced: 1});
            added++;
          }
        });

        writeDB(db);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, added, updated}));
      } catch (err) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(
          JSON.stringify({error: 'Invalid JSON payload: ' + err.message}),
        );
      }
    });
    return;
  }

  // 4. GET /api/sync/attendance
  if (pathname === '/api/sync/attendance' && req.method === 'GET') {
    const db = readDB();
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(db.attendance));
    return;
  }

  // 5. POST /api/sync/attendance
  if (pathname === '/api/sync/attendance' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const incoming = JSON.parse(body);
        const incomingList = Array.isArray(incoming) ? incoming : [incoming];
        const db = readDB();

        let added = 0;

        incomingList.forEach(record => {
          if (!record.uuid) {
            return;
          }
          const exists = db.attendance.some(r => r.uuid === record.uuid);
          if (!exists) {
            db.attendance.push({...record, synced: 1, synced_at: Date.now()});
            added++;
          }
        });

        writeDB(db);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, added}));
      } catch (err) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(
          JSON.stringify({error: 'Invalid JSON payload: ' + err.message}),
        );
      }
    });
    return;
  }

  // Route not found
  res.writeHead(404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({error: 'Route not found'}));
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('NHAI Datalake 3.0 Sync Server running at:');
  console.log(`http://localhost:${PORT}`);
  console.log("To connect real devices, use your machine's local IP.");
  console.log('====================================================');
});
