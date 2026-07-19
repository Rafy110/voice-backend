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

app.post('/webhook', (req, res) => {
  console.log('Event from Vapi:', JSON.stringify(req.body, null, 2));

  const stmt = db.prepare(
    'INSERT INTO calls (call_id, event_type, payload) VALUES (?, ?, ?)'
  );
  stmt.run(
    req.body?.call?.id || 'unknown',
    req.body?.message?.type || 'unknown',
    JSON.stringify(req.body)
  );

  res.status(200).send('ok');
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