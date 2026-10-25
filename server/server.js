require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { startOverdueCheck } = require('./jobs/overdueCheck');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing from server/.env. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();

// Only the AGAPAY frontend may call the API from a browser.
// CLIENT_URL can list several addresses, separated by commas.
// Not set = any address (fine on your own laptop; set it before going online).
const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(allowed.length ? { origin: allowed } : undefined));

// Behind a host like Render/Railway, so req.ip is the visitor (for the contact form limit)
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(express.json({ limit: '200kb' }));

// Profile photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d', index: false }));

// Test the MySQL connection when the server starts
pool
  .getConnection()
  .then((conn) => {
    console.log('MySQL connected (XAMPP)');
    conn.release();
  })
  .catch((err) => {
    console.error('MySQL connection failed:', err.message);
  });

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/residents', require('./routes/residentRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/handovers', require('./routes/handoverRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/push', require('./routes/pushRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Unknown API address
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// One place for errors. Express 5 sends errors from async routes here by itself,
// so the routes don't need try/catch. The real error is logged, never shown to users.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'The request is too large.' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'The photo must be 5 MB or smaller.' });
  if (err.name === 'MulterError') return res.status(400).json({ message: 'Please send one photo in the "photo" field.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That already exists.' });
  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
    console.error(err);
    return res.status(500).json({ message: 'The database is missing a table or column. Run server/migrations/001_backend_requests.sql.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server. Please try again.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startOverdueCheck();
});
