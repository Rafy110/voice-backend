const express = require('express');
const Database = require('better-sqlite3');
const fs = require('fs');
const cron = require('node-cron');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
app.use(express.json());

const db = new Database('/data/calls.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id TEXT,
    event_type TEXT,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function logEvent(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

// --- R2 Backup setup ---
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function backupDatabase() {
  try {
    const fileContent = fs.readFileSync('/data/calls.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `calls-backup-${timestamp}.db`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileContent,
    }));

    logEvent('info', 'Backup uploaded successfully', { key });
  } catch (err) {
    logEvent('error', 'Backup failed', { error: err.message });
  }
}

// Run backup every 6 hours
cron.schedule('0 */6 * * *', backupDatabase);

// --- Routes ---
app.post('/webhook', (req, res) => {
  try {
    const callId = req.body?.call?.id || 'unknown';
    const eventType = req.body?.message?.type || 'unknown';

    logEvent('info', 'Received Vapi event', { callId, eventType });

    const stmt = db.prepare(
      'INSERT INTO calls (call_id, event_type, payload) VALUES (?, ?, ?)'
    );
    stmt.run(callId, eventType, JSON.stringify(req.body));

    logEvent('info', 'Event saved to database', { callId, eventType });

    res.status(200).send('ok');
  } catch (err) {
    logEvent('error', 'Failed to process webhook event', { error: err.message });
    res.status(500).send('error');
  }
});

app.get('/calls', (req, res) => {
  const rows = db.prepare('SELECT * FROM calls ORDER BY id DESC').all();
  res.json(rows);
});

app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Manual trigger for testing backups on demand
app.post('/trigger-backup', async (req, res) => {
  await backupDatabase();
  res.status(200).send('backup triggered, check logs');
});

app.get('/', (req, res) => {
  res.send('Backend is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logEvent('info', `Server listening on port ${PORT}`);
});