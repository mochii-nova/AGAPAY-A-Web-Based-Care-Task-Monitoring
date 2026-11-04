const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { photoUpload, looksLikeImage, PHOTO_DIR } = require('../middleware/upload');
const { publicUser, fullUser, strongPassword, PASSWORD_RULE, validEmail, clean } = require('../utils/users');
const { isShift, isDate } = require('../utils/shifts');

const router = express.Router();
router.use(protect);

const getUser = async (id) => (await pool.query('SELECT * FROM users WHERE id = ?', [id]))[0][0];

// Is this email used by someone else?
const emailTaken = async (email, myId) =>
  (await pool.query('SELECT id FROM users WHERE email = ? AND id <> ?', [email, myId]))[0].length > 0;

// =====================================================================
//  My own account (any signed-in user). These come before /:id.
// =====================================================================

// GET /api/users/me
router.get('/me', async (req, res) => {
  res.json(fullUser(await getUser(req.user.id), req));
});

// PATCH /api/users/me  { firstName, lastName, email, phone, emergencyContact: { name, relationship, phone } }
// Role, shift, date hired and status can NOT be changed here (only an admin can).
router.patch('/me', async (req, res) => {
  const me = await getUser(req.user.id);
  const b = req.body;
  const has = (key) => Object.prototype.hasOwnProperty.call(b, key);

  const first = has('firstName') ? clean(b.firstName, 40) : me.first_name;
  const last = has('lastName') ? clean(b.lastName, 40) : me.last_name;
  if ((has('firstName') || has('lastName')) && (!first || !last)) {
    return res.status(400).json({ message: 'First and last name are required.' });
  }
  const name = has('firstName') || has('lastName') ? `${first} ${last}`.slice(0, 80) : me.name;

  let email = me.email;
  if (has('email')) {
    email = clean(b.email, 120)?.toLowerCase() ?? null;
    if (email && !validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (email && (await emailTaken(email, me.id))) return res.status(409).json({ message: 'This email is already used by another account.' });
  }

  const ec = b.emergencyContact ?? {};
  const ecHas = (key) => b.emergencyContact && Object.prototype.hasOwnProperty.call(ec, key);

  await pool.query(
    `UPDATE users SET name = ?, first_name = ?, last_name = ?, email = ?, phone = ?,
       emergency_name = ?, emergency_relationship = ?, emergency_phone = ?
     WHERE id = ?`,
    [
      name,
      first,
      last,
      email,
      has('phone') ? clean(b.phone, 20) : me.phone,
      ecHas('name') ? clean(ec.name, 80) : me.emergency_name,
      ecHas('relationship') ? clean(ec.relationship, 40) : me.emergency_relationship,
      ecHas('phone') ? clean(ec.phone, 20) : me.emergency_phone,
      me.id,
    ]
  );
  res.json(fullUser(await getUser(me.id), req));
});

// POST /api/users/me/photo  (multipart/form-data, field "photo")  ->  { photoUrl }
router.post('/me/photo', photoUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose a photo.' });
  if (!looksLikeImage(req.file.path)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ message: 'Please choose a JPG or PNG image.' });
  }

  const me = await getUser(req.user.id);
  const saved = `/uploads/photos/${req.file.filename}`;
  await pool.query('UPDATE users SET photo_url = ? WHERE id = ?', [saved, me.id]);

  // Remove the old photo file
  if (me.photo_url?.startsWith('/uploads/photos/')) {
    fs.unlink(path.join(PHOTO_DIR, path.basename(me.photo_url)), () => {});
  }
  res.json({ photoUrl: fullUser({ ...me, photo_url: saved }, req).photoUrl });
});

// DELETE /api/users/me/photo  ->  back to initials
router.delete('/me/photo', async (req, res) => {
  const me = await getUser(req.user.id);
  await pool.query('UPDATE users SET photo_url = NULL WHERE id = ?', [me.id]);
  if (me.photo_url?.startsWith('/uploads/photos/')) {
    fs.unlink(path.join(PHOTO_DIR, path.basename(me.photo_url)), () => {});
  }
  res.json({ photoUrl: null });
});

// PATCH /api/users/me/password  { currentPassword, newPassword }
router.patch('/me/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please enter your current and new password.' });
  }
  const me = await getUser(req.user.id);
  if (!(await bcrypt.compare(currentPassword, me.password))) {
    return res.status(400).json({ message: 'Your current password is wrong.' });
  }
  if (!strongPassword(newPassword)) return res.status(400).json({ message: PASSWORD_RULE });
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'The new password must be different from the current one.' });
  }
  await pool.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(newPassword, 10), me.id]);
  res.json({ message: 'Password changed.' });
});

// =====================================================================
//  Staff management (admin only)
// =====================================================================

// GET /api/users?status=pending&role=caregiver
router.get('/', allowRoles('admin'), async (req, res) => {
  const where = [];
  const params = [];
  if (['pending', 'active', 'inactive'].includes(req.query.status)) {
    where.push('status = ?');
    params.push(req.query.status);
  }
  if (['caregiver', 'admin'].includes(req.query.role)) {
    where.push('role = ?');
    params.push(req.query.role);
  }
  const [rows] = await pool.query(
    `SELECT * FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name ASC`,
    params
  );
  res.json(rows.map((u) => fullUser(u, req)));
});

// POST /api/users  { name or firstName+lastName, username, password, role, email, phone, assignedShift, dateHired, title }
// How admins create accounts (including other admins). Active straight away.
router.post('/', allowRoles('admin'), async (req, res) => {
  const b = req.body;
  const first = clean(b.firstName, 40);
  const last = clean(b.lastName, 40);
  const name = clean(b.name, 80) ?? clean([first, last].filter(Boolean).join(' '), 80);
  const username = clean(b.username, 30)?.toUpperCase();
  const role = b.role === 'admin' ? 'admin' : 'caregiver';
  const email = clean(b.email, 120)?.toLowerCase() ?? null;

  if (!name || !username || !b.password) return res.status(400).json({ message: 'Name, Employee ID and password are required.' });
  if (!strongPassword(b.password)) return res.status(400).json({ message: PASSWORD_RULE });
  if (email && !validEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (b.assignedShift && !isShift(b.assignedShift)) return res.status(400).json({ message: 'Shift must be Morning, Afternoon or Night.' });
  if (b.dateHired && !isDate(b.dateHired)) return res.status(400).json({ message: 'Date hired must look like 2026-01-31.' });

  if ((await pool.query('SELECT id FROM users WHERE username = ?', [username]))[0].length) {
    return res.status(409).json({ message: 'This Employee ID already has an account.' });
  }
  if (email && (await emailTaken(email, 0))) return res.status(409).json({ message: 'This email already has an account.' });

  const [result] = await pool.query(
    `INSERT INTO users (name, first_name, last_name, username, password, role, status, email, phone, assigned_shift, date_hired, title)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [name, first, last, username, await bcrypt.hash(b.password, 10), role, email, clean(b.phone, 20),
     b.assignedShift || null, b.dateHired || null, clean(b.title, 60)]
  );
  res.status(201).json(fullUser(await getUser(result.insertId), req));
});

// GET /api/users/:id
router.get('/:id', allowRoles('admin'), async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(fullUser(user, req));
});

// PATCH /api/users/:id  { assignedShift, dateHired, title, role }  (the admin-only details)
router.patch('/:id', allowRoles('admin'), async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const b = req.body;
  const has = (key) => Object.prototype.hasOwnProperty.call(b, key);

  if (has('assignedShift') && b.assignedShift && !isShift(b.assignedShift)) {
    return res.status(400).json({ message: 'Shift must be Morning, Afternoon or Night.' });
  }
  if (has('dateHired') && b.dateHired && !isDate(b.dateHired)) {
    return res.status(400).json({ message: 'Date hired must look like 2026-01-31.' });
  }
  if (has('role') && !['caregiver', 'admin'].includes(b.role)) {
    return res.status(400).json({ message: 'Role must be caregiver or admin.' });
  }
  if (has('role') && user.id === req.user.id && b.role !== 'admin') {
    return res.status(400).json({ message: 'You cannot remove your own admin role.' });
  }

  await pool.query('UPDATE users SET assigned_shift = ?, date_hired = ?, title = ?, role = ? WHERE id = ?', [
    has('assignedShift') ? b.assignedShift || null : user.assigned_shift,
    has('dateHired') ? b.dateHired || null : user.date_hired,
    has('title') ? clean(b.title, 60) : user.title,
    has('role') ? b.role : user.role,
    user.id,
  ]);
  res.json(fullUser(await getUser(user.id), req));
});

// PATCH /api/users/:id/status  { status: 'active' | 'inactive' | 'pending' }  (approve / deactivate)
router.patch('/:id/status', allowRoles('admin'), async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending, active or inactive.' });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own status.' });
  }
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, user.id]);
  res.json(fullUser({ ...user, status }, req));
});

// POST /api/users/:id/reset-password  ->  { temporaryPassword }
// For "Forgot password": the admin gives the temporary password to the caregiver,
// who then changes it in My Profile.
router.post('/:id/reset-password', allowRoles('admin'), async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // e.g. "agapay-7k2m9q4x": easy to read out loud, always has letters and numbers
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(digits), pick(digits), ...Array.from({ length: 6 }, () => pick(letters + digits))];
  const temporaryPassword = `agapay-${chars.sort(() => crypto.randomInt(3) - 1).join('')}`;

  await pool.query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(temporaryPassword, 10), user.id]);
  res.json({ message: `Temporary password set for ${user.name}.`, temporaryPassword });
});

// DELETE /api/users/:id
router.delete('/:id', allowRoles('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await pool.query('DELETE FROM users WHERE id = ?', [user.id]);
  if (user.photo_url?.startsWith('/uploads/photos/')) {
    fs.unlink(path.join(PHOTO_DIR, path.basename(user.photo_url)), () => {});
  }
  res.json({ message: 'Staff removed' });
});

// Short list of staff for pickers (e.g. "assign task to"). Admin only.
// GET /api/users/list/caregivers
router.get('/list/caregivers', allowRoles('admin'), async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE role = 'caregiver' AND status = 'active' ORDER BY name");
  res.json(rows.map((u) => publicUser(u, req)));
});

module.exports = router;
