const express = require('express');
const Database = require('better-sqlite3');

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

app.get('/', (req, res) => {
  res.send('Backend is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});