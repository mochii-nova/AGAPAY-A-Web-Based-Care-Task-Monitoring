const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { notifyLater } = require('../utils/notify');
const { SHIFT_LABEL, isShift, isDate, addDays, shiftTimes, shiftAt } = require('../utils/shifts');

const router = express.Router();
router.use(protect);

const toShift = (r) => ({
  _id: r.id,
  id: r.id,
  userId: r.user_id,
  userName: r.user_name,
  shiftDate: r.shift_date, // 'YYYY-MM-DD'
  shift: r.shift, // 'Morning' | 'Afternoon' | 'Night'  (shown as Morning / Noon / Night)
  ...shiftTimes(r.shift_date, r.shift), // startsAt / endsAt as ISO times
});

// "Mon, Oct 27"
const prettyDate = (ymd) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

const tellSchedule = (userId, shiftDate, text) =>
  notifyLater([userId], {
    type: 'schedule',
    title: 'Your schedule changed',
    body: `${prettyDate(shiftDate)}: ${text}`,
    link: '/schedule',
    tag: `schedule-${shiftDate}`,
  });

// GET /api/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD
// Caregiver: my shifts. Admin: everyone's (or ?userId=5 for one person).
// Without dates: from today for 2 weeks.
router.get('/', async (req, res) => {
  const today = shiftAt().shiftDate;
  const from = req.query.from ?? today;
  const to = req.query.to ?? addDays(from, 13);
  if (!isDate(from) || !isDate(to)) return res.status(400).json({ message: 'Dates must look like 2026-10-31.' });
  if (to < from) return res.status(400).json({ message: '`to` must be on or after `from`.' });
  if (Date.parse(to) - Date.parse(from) > 366 * 86400000) return res.status(400).json({ message: 'Please ask for at most one year.' });

  const params = [from, to];
  let who = '';
  if (req.user.role !== 'admin') {
    who = 'AND s.user_id = ?';
    params.push(req.user.id);
  } else if (req.query.userId) {
    who = 'AND s.user_id = ?';
    params.push(req.query.userId);
  }

  const [rows] = await pool.query(
    `SELECT s.*, u.name AS user_name FROM shifts s JOIN users u ON u.id = s.user_id
     WHERE s.shift_date BETWEEN ? AND ? ${who} ORDER BY s.shift_date, FIELD(s.shift, 'Morning', 'Afternoon', 'Night'), u.name`,
    params
  );
  res.json(rows.map(toShift));
});

// GET /api/shifts/current  ->  the shift happening right now and who's on it
router.get('/current', async (req, res) => {
  const now = shiftAt();
  const [rows] = await pool.query(
    'SELECT s.*, u.name AS user_name FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.shift_date = ? AND s.shift = ?',
    [now.shiftDate, now.shift]
  );
  res.json({ ...now, ...shiftTimes(now.shiftDate, now.shift), staff: rows.map(toShift) });
});

// PUT /api/shifts  (admin)  { userId, shiftDate, shift }   shift null = day off
// Sets (or changes) one person's shift on one day.
router.put('/', allowRoles('admin'), async (req, res) => {
  const { userId, shiftDate, shift } = req.body;
  if (!isDate(shiftDate)) return res.status(400).json({ message: 'shiftDate must look like 2026-10-31.' });
  if (shift !== null && shift !== undefined && shift !== '' && !isShift(shift)) {
    return res.status(400).json({ message: 'Shift must be Morning, Afternoon, Night or null (day off).' });
  }
  const [[user]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'caregiver'", [userId]);
  if (!user) return res.status(404).json({ message: 'Caregiver not found' });

  const [[before]] = await pool.query('SELECT shift FROM shifts WHERE user_id = ? AND shift_date = ?', [user.id, shiftDate]);

  if (!shift) {
    await pool.query('DELETE FROM shifts WHERE user_id = ? AND shift_date = ?', [user.id, shiftDate]);
    if (before) tellSchedule(user.id, shiftDate, 'now a day off');
    return res.json({ message: 'Day off saved', userId: user.id, shiftDate, shift: null });
  }

  await pool.query(
    'INSERT INTO shifts (user_id, shift_date, shift) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE shift = VALUES(shift)',
    [user.id, shiftDate, shift]
  );
  if (before?.shift !== shift) tellSchedule(user.id, shiftDate, `${SHIFT_LABEL[shift]} shift`);

  const [[row]] = await pool.query(
    'SELECT s.*, u.name AS user_name FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? AND s.shift_date = ?',
    [user.id, shiftDate]
  );
  res.json(toShift(row));
});

// POST /api/shifts/bulk  (admin)  { userId, from, to, shift, skipWeekdays: [3] }
// Fills a date range in one go, e.g. "Morning every day in November except Wednesdays".
// No notifications for bulk fills (it would be one per day).
router.post('/bulk', allowRoles('admin'), async (req, res) => {
  const { userId, from, to, shift } = req.body;
  const skip = Array.isArray(req.body.skipWeekdays) ? req.body.skipWeekdays.map(Number) : [];
  if (!isDate(from) || !isDate(to) || to < from) return res.status(400).json({ message: 'Give a valid from / to date.' });
  if (Date.parse(to) - Date.parse(from) > 92 * 86400000) return res.status(400).json({ message: 'At most 3 months at a time.' });
  if (!isShift(shift)) return res.status(400).json({ message: 'Shift must be Morning, Afternoon or Night.' });
  const [[user]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'caregiver'", [userId]);
  if (!user) return res.status(404).json({ message: 'Caregiver not found' });

  const rows = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (!skip.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) rows.push([user.id, d, shift]);
  }
  if (rows.length) {
    await pool.query('INSERT INTO shifts (user_id, shift_date, shift) VALUES ? ON DUPLICATE KEY UPDATE shift = VALUES(shift)', [rows]);
  }
  res.json({ message: `${rows.length} shifts saved`, count: rows.length });
});

// DELETE /api/shifts/:id  (admin)
router.delete('/:id', allowRoles('admin'), async (req, res) => {
  const [[row]] = await pool.query('SELECT * FROM shifts WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ message: 'Shift not found' });
  await pool.query('DELETE FROM shifts WHERE id = ?', [row.id]);
  tellSchedule(row.user_id, row.shift_date, 'now a day off');
  res.json({ message: 'Shift removed' });
});

module.exports = router;
