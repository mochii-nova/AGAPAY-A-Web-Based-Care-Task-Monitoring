const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { clean, NAME_SQL, NAME_ORDER } = require('../utils/users');
const { ROOM_JOIN, ROOM_LABEL } = require('../utils/rooms');
const { isDate } = require('../utils/shifts');

const router = express.Router();
router.use(protect);

const CARE_NEEDS = ['hygiene', 'mobility', 'meal', 'medical', 'rest', 'recreation'];
const SELECT_RESIDENTS = `
  SELECT r.*, ${ROOM_LABEL} AS room, rm.room_number, rm.room_type, bd.bed_code
  FROM residents r ${ROOM_JOIN('r')}`;
const ROOM_ORDER = 'rm.room_number, bd.bed_code, r.name';
const findResident = async (id) => (await pool.query(`${SELECT_RESIDENTS} WHERE r.id = ?`, [id]))[0][0];

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
  room: r.room, // "101" (private) or "201 · Bed B2" (ward)
  roomId: r.room_id,
  roomNumber: r.room_number,
  roomType: r.room_type, // 'private' | 'ward'
  bedId: r.bed_id, // null in a private room
  bedCode: r.bed_code,
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
    `SELECT ra.resident_id, u.id, ${NAME_SQL('u')} AS name FROM resident_assignments ra
    JOIN users u ON u.id = ra.user_id AND u.status = 'active' WHERE ra.resident_id IN (?) ORDER BY ${NAME_ORDER('u')}`,
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

async function checkPlacement(roomId, bedId, residentId = 0) {
  const [[room]] = await pool.query('SELECT * FROM rooms WHERE id = ?', [roomId || 0]);
  if (!room) return { error: 'Please choose a room.' };

  if (room.room_type === 'private') {
    if (bedId) return { error: `Room ${room.room_number} is a private room, so it has no beds. Leave the bed empty.` };
    const [[other]] = await pool.query('SELECT name FROM residents WHERE room_id = ? AND id <> ? LIMIT 1', [room.id, residentId]);
    if (other) return { error: `Room ${room.room_number} is a private room and ${other.name} already stays there.` };
    return { values: { room_id: room.id, bed_id: null } };
  }

  if (!bedId) return { error: `Room ${room.room_number} is a ward. Please choose a bed.` };
  const [[bed]] = await pool.query('SELECT * FROM beds WHERE id = ? AND room_id = ?', [bedId, room.id]);
  if (!bed) return { error: `That bed is not in room ${room.room_number}.` };
  const [[other]] = await pool.query('SELECT name FROM residents WHERE bed_id = ? AND id <> ? LIMIT 1', [bed.id, residentId]);
  if (other) return { error: `Bed ${bed.bed_code} in room ${room.room_number} is already taken by ${other.name}.` };
  return { values: { room_id: room.id, bed_id: bed.id } };
}

// GET /api/residents  (caregiver: my assigned residents; admin: all)
router.get('/', async (req, res) => {
  const [rows] =
    req.user.role === 'admin'
      ? await pool.query(`${SELECT_RESIDENTS} ORDER BY ${ROOM_ORDER}`)
      : await pool.query(
          `${SELECT_RESIDENTS} JOIN resident_assignments ra ON ra.resident_id = r.id
           WHERE ra.user_id = ? ORDER BY ${ROOM_ORDER}`,
          [req.user.id]
        );
  res.json(await withCaregivers(rows));
});

// GET /api/residents/:id
router.get('/:id', async (req, res) => {
  const row = await findResident(req.params.id);
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

  const place = await checkPlacement(req.body.roomId, req.body.bedId);
  if (place.error) return res.status(400).json({ message: place.error });

  const [result] = await pool.query('INSERT INTO residents SET ?', [{ ...values, ...place.values }]);
  // Link old tasks that were saved with this resident's name
  await pool.query('UPDATE tasks SET resident_id = ? WHERE resident_id IS NULL AND resident = ?', [result.insertId, values.name]);
  if (Array.isArray(req.body.caregiverIds)) await setCaregivers(result.insertId, req.body.caregiverIds);

  const row = await findResident(result.insertId);
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

  const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key);
  if (has('roomId') || has('bedId')) {
    const place = await checkPlacement(
      has('roomId') ? req.body.roomId : before.room_id,
      has('bedId') ? req.body.bedId : before.bed_id,
      before.id
    );
    if (place.error) return res.status(400).json({ message: place.error });
    Object.assign(values, place.values);
  }

  if (Object.keys(values).length) await pool.query('UPDATE residents SET ? WHERE id = ?', [values, before.id]);
  // Keep the old name column on tasks in step while the frontend still reads it
  if (values.name) await pool.query('UPDATE tasks SET resident = ? WHERE resident_id = ?', [values.name, before.id]);
  if (Array.isArray(req.body.caregiverIds)) await setCaregivers(before.id, req.body.caregiverIds);

  const row = await findResident(before.id);
  res.json((await withCaregivers([row]))[0]);
});

// PUT /api/residents/:id/caregivers  (admin)  { caregiverIds: [1, 2] }  replaces the list
router.put('/:id/caregivers', allowRoles('admin'), async (req, res) => {
  const row = await findResident(req.params.id);
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