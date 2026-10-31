const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db');
const { fullUser, strongPassword, PASSWORD_RULE, validEmail, clean } = require('../utils/users');

const router = express.Router();

const GOOGLE_NOT_LINKED =
  'This Google account isn’t linked to an approved AGAPAY account. Sign in with your Employee ID, or ask the administrator to add this email to your account.';

// Global session handler for both standard login and Google auth
function sendSession(req, res, user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, user: fullUser(user, req) });
}

// REGISTER
router.post('/register', async (req, res) => {
  const { name, firstName, lastName, username, password } = req.body;
  const first = clean(firstName, 40);
  const last = clean(lastName, 40);
  const fullName = clean(name, 80) ?? clean([first, last].filter(Boolean).join(' '), 80);
  const employeeId = clean(username, 30)?.toUpperCase();
  const email = clean(req.body.email, 120)?.toLowerCase() ?? null;
  const phone = clean(req.body.phone, 20);

  if (!fullName || !employeeId || !password) {
    return res.status(400).json({ message: 'Please fill in all fields.' });
  }
  if (!strongPassword(password)) return res.status(400).json({ message: PASSWORD_RULE });
  if (email && !validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [employeeId]);
  if (existing.length > 0) {
    return res.status(409).json({ message: 'This Employee ID already has an account.' });
  }
  if (email) {
    const [taken] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (taken.length > 0) return res.status(409).json({ message: 'This email already has an account.' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (name, first_name, last_name, username, password, role, status, email, phone)
     VALUES (?, ?, ?, ?, ?, 'caregiver', 'pending', ?, ?)`,
    [fullName, first, last, employeeId, hashed, email, phone]
  );

  res.status(201).json({
    message: 'Account created. An administrator needs to approve it before you can sign in.',
    id: result.insertId,
    status: 'pending',
  });
});

// LOGIN
router.post('/login', async (req, res) => {
  const login = String(req.body.username ?? '').trim();
  const { password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ message: 'Please enter your Employee ID and password.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [login, login.toLowerCase()]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid Employee ID or password.' });
  }

  if (user.status === 'pending') return res.status(403).json({ message: 'Your account is waiting for approval.' });
  if (user.status !== 'active') return res.status(403).json({ message: 'Your account is inactive.' });

  sendSession(req, res, user);
});

const googleClient = new OAuth2Client();

// GOOGLE AUTH
router.post('/google', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ message: 'Google sign-in isn’t set up on the server yet. Please use your Employee ID.' });
  }
  const { accessToken } = req.body;
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 4096) {
    return res.status(400).json({ message: 'Google sign-in failed. Please try again.' });
  }

  let info;
  try {
    info = await googleClient.getTokenInfo(accessToken);
  } catch {
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }

  if (info.aud !== clientId) {
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }

  if (!info.email || String(info.email_verified) !== 'true') {
    return res.status(401).json({ message: 'This Google account’s email isn’t verified.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [info.email.toLowerCase()]);
  const user = rows[0];
  if (!user) return res.status(403).json({ message: GOOGLE_NOT_LINKED });
  if (user.status === 'pending') return res.status(403).json({ message: 'Your account is waiting for approval.' });
  if (user.status !== 'active') return res.status(403).json({ message: 'Your account is inactive.' });

  sendSession(req, res, user);
});

module.exports = router;