const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { fullUser, strongPassword, PASSWORD_RULE, validEmail, clean } = require('../utils/users');

const router = express.Router();

// REGISTER (anyone). Always makes a caregiver account that waits for an admin to approve it.
// Admins are created by another admin (POST /api/users) or in phpMyAdmin.
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

// LOGIN with the Employee ID or the email address
router.post('/login', async (req, res) => {
  const login = String(req.body.username ?? '').trim();
  const { password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ message: 'Please enter your Employee ID and password.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1', [login, login.toLowerCase()]);
  const user = rows[0];
  // Same answer for "no such user" and "wrong password", so nobody can find out which IDs exist
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid Employee ID or password.' });
  }

  // Only checked after the password is right
  if (user.status === 'pending') return res.status(403).json({ message: 'Your account is waiting for approval.' });
  if (user.status !== 'active') return res.status(403).json({ message: 'Your account is inactive.' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // AuthContext.login expects { token, user }
  res.json({ token, user: fullUser(user, req) });
});

module.exports = router;
