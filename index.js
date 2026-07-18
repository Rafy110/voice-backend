const express = require('express');
const app = express();
app.use(express.json());

// Vapi will send data here whenever something happens in a call
app.post('/webhook', (req, res) => {
  console.log('Event from Vapi:', JSON.stringify(req.body, null, 2));
  res.status(200).send('ok');
});

// Just a simple check to confirm the server is alive
app.get('/', (req, res) => {
  res.send('Backend is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});