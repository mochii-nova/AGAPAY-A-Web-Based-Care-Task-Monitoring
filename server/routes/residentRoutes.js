const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { clean } = require('../utils/users');
const { isDate } = require('../utils/shifts');

const router = express.Router();
router.use(protect);

const CARE_NEEDS = ['hygiene', 'mobility', 'meal', 'medical', 'rest', 'recreation'];

// Age today, from the birth date
function ageFrom(birthDate) {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

const toResident = (r, caregivers = []) => ({
  _id: r.id,
  id: r.id,
  residentCode: r.resident_code, // e.g. RP-2020-001 (the sample data used this as `id`)
  name: r.name,
  room: r.room,
  birthDate: r.birth_date,
  age: ageFrom(r.birth_date),
  gender: r.gender,
  careNeeds: r.care_needs ? r.care_needs.split(',') : [],
  careNote: r.care_note,
  emergencyContact: { name: r.emergency_name, relationship: r.emergency_relationship, phone: r.emergency_phone },
  caregivers, // [{ id, name }] who look after this resident
});

// Adds the caregivers to a list of resident rows (one query for all of them)
async function withCaregivers(rows) {
  if (rows.length === 0) return [];
  const [links] = await pool.query(
    `SELECT ra.resident_id, u.id, u.name FROM resident_assignments ra
     JOIN users u ON u.id = ra.user_id WHERE ra.resident_id IN (?) ORDER BY u.name`,
    [rows.map((r) => r.id)]
  );
  return rows.map((r) =>
    toResident(r, links.filter((l) => l.resident_id === r.id).map((l) => ({ _id: l.id, id: l.id, name: l.name })))
  );
}

// May this user see this resident? Admins: all. Caregivers: only the ones assigned to them.
async function canSee(user, residentId) {
  if (user.role === 'admin') return true;
  const [rows] = await pool.query('SELECT 1 FROM resident_assignments WHERE resident_id = ? AND user_id = ?', [residentId, user.id]);
  return rows.length > 0;
}

// Checks the fields sent by the admin. Returns { error } or { values }.
function readFields(b, isNew) {
  const has = (key) => Object.prototype.hasOwnProperty.call(b, key);
  const v = {};

  if (isNew || has('residentCode')) {
    v.resident_code = clean(b.residentCode, 20)?.toUpperCase();
    if (!v.resident_code) return { error: 'Resident ID (e.g. RP-2020-001) is required.' };
  }
  if (isNew || has('name')) {
    v.name = clean(b.name, 80);
    if (!v.name) return { error: 'Name is required.' };
  }
  if (isNew || has('room')) {
    v.room = clean(b.room, 10);
    if (!v.room) return { error: 'Room is required.' };
  }
  if (has('birthDate')) {
    if (b.birthDate && !isDate(b.birthDate)) return { error: 'Birth date must look like 1950-01-31.' };
    v.birth_date = b.birthDate || null;
  }
  if (has('gender')) {
    if (b.gender && !['Female', 'Male'].includes(b.gender)) return { error: 'Gender must be Female or Male.' };
    v.gender = b.gender || null;
  }
  if (has('careNeeds')) {
    const needs = Array.isArray(b.careNeeds) ? b.careNeeds : [];
    if (needs.some((n) => !CARE_NEEDS.includes(n))) return { error: `Care needs must be from: ${CARE_NEEDS.join(', ')}.` };
    v.care_needs = needs.length ? [...new Set(needs)].join(',') : null;
  }
  if (has('careNote')) v.care_note = clean(b.careNote, 2000);
  if (b.emergencyContact) {
    const ec = b.emergencyContact;
    if ('name' in ec) v.emergency_name = clean(ec.name, 80);
    if ('relationship' in ec) v.emergency_relationship = clean(ec.relationship, 40);
    if ('phone' in ec) v.emergency_phone = clean(ec.phone, 20);
  }
  return { values: v };
}

// GET /api/residents  (caregiver: my assigned residents; admin: all)
router.get('/', async (req, res) => {
  const [rows] =
    req.user.role === 'admin'
      ? await pool.query('SELECT * FROM residents ORDER BY room, name')
      : await pool.query(
          `SELECT r.* FROM residents r JOIN resident_assignments ra ON ra.resident_id = r.id
           WHERE ra.user_id = ? ORDER BY r.room, r.name`,
          [req.user.id]
        );
  res.json(await withCaregivers(rows));
});

// GET /api/residents/:id
router.get('/:id', async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM residents WHERE id = ?', [req.params.id]);
  // Same answer for "doesn't exist" and "not yours", so caregivers can't probe other residents
  if (!row || !(await canSee(req.user, row.id))) return res.status(404).json({ message: 'Resident not found' });
  res.json((await withCaregivers([row]))[0]);
});

// POST /api/residents  (admin)  { residentCode, name, room, birthDate, gender, careNeeds: [], careNote, emergencyContact, caregiverIds: [] }
router.post('/', allowRoles('admin'), async (req, res) => {
  const { error, values } = readFields(req.body, true);
  if (error) return res.status(400).json({ message: error });

  const [taken] = await pool.query('SELECT id FROM residents WHERE resident_code = ?', [values.resident_code]);
  if (taken.length) return res.status(409).json({ message: 'This Resident ID is already used.' });

  const [result] = await pool.query('INSERT INTO residents SET ?', [values]);
  // Link old tasks that were saved with this resident's name
  await pool.query('UPDATE tasks SET resident_id = ? WHERE resident_id IS NULL AND resident = ?', [result.insertId, values.name]);
  if (Array.isArray(req.body.caregiverIds)) await setCaregivers(result.insertId, req.body.caregiverIds);

  const [[row]] = await pool.query('SELECT * FROM residents WHERE id = ?', [result.insertId]);
  res.status(201).json((await withCaregivers([row]))[0]);
});

// PUT /api/residents/:id  (admin)  any of the fields above
router.put('/:id', allowRoles('admin'), async (req, res) => {
  const [[before]] = await pool.query('SELECT * FROM residents WHERE id = ?', [req.params.id]);
  if (!before) return res.status(404).json({ message: 'Resident not found' });

  const { error, values } = readFields(req.body, false);
  if (error) return res.status(400).json({ message: error });
  if (values.resident_code && values.resident_code !== before.resident_code) {
    const [taken] = await pool.query('SELECT id FROM residents WHERE resident_code = ? AND id <> ?', [values.resident_code, before.id]);
    if (taken.length) return res.status(409).json({ message: 'This Resident ID is already used.' });
  }

  if (Object.keys(values).length) await pool.query('UPDATE residents SET ? WHERE id = ?', [values, before.id]);
  // Keep the old name column on tasks in step while the frontend still reads it
  if (values.name) await pool.query('UPDATE tasks SET resident = ? WHERE resident_id = ?', [values.name, before.id]);
  if (Array.isArray(req.body.caregiverIds)) await setCaregivers(before.id, req.body.caregiverIds);

  const [[row]] = await pool.query('SELECT * FROM residents WHERE id = ?', [before.id]);
  res.json((await withCaregivers([row]))[0]);
});

// PUT /api/residents/:id/caregivers  (admin)  { caregiverIds: [1, 2] }  replaces the list
router.put('/:id/caregivers', allowRoles('admin'), async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM residents WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Resident not found' });
  if (!Array.isArray(req.body.caregiverIds)) return res.status(400).json({ message: 'caregiverIds must be a list.' });
  await setCaregivers(row.id, req.body.caregiverIds);
  res.json((await withCaregivers([row]))[0]);
});

// DELETE /api/residents/:id  (admin)
router.delete('/:id', allowRoles('admin'), async (req, res) => {
  const [result] = await pool.query('DELETE FROM residents WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ message: 'Resident not found' });
  res.json({ message: 'Resident removed' });
});

// Replaces who looks after a resident (only active caregivers are kept)
async function setCaregivers(residentId, ids) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM resident_assignments WHERE resident_id = ?', [residentId]);
    const clean = [...new Set(ids.map(Number).filter(Boolean))];
    if (clean.length) {
      const [valid] = await conn.query("SELECT id FROM users WHERE id IN (?) AND role = 'caregiver'", [clean]);
      if (valid.length) {
        await conn.query('INSERT INTO resident_assignments (resident_id, user_id) VALUES ?', [valid.map((u) => [residentId, u.id])]);
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = router;
