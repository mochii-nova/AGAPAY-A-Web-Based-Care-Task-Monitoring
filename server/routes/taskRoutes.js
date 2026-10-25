const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { notifyLater } = require('../utils/notify');
const { clean } = require('../utils/users');

const router = express.Router();
router.use(protect);

const CATEGORIES = ['hygiene', 'mobility', 'meal', 'medical', 'rest', 'recreation'];

const SELECT_TASKS = `
  SELECT t.*, r.resident_code, r.room, r.name AS resident_name,
         a.name AS assigned_name, c.name AS completed_name
  FROM tasks t
  LEFT JOIN residents r ON r.id = t.resident_id
  LEFT JOIN users a     ON a.id = t.assigned_to
  LEFT JOIN users c     ON c.id = t.completed_by
`;

// pending + past due = overdue (calculated, never stored)
const statusOf = (r) => (r.status === 'pending' && new Date(r.due_at) < new Date() ? 'overdue' : r.status);

// Convert a DB row to the shape the React pages use
const toTask = (r) => ({
  _id: r.id,
  id: r.id,
  task: r.task,
  resident: r.resident_name ?? r.resident, // the name (kept until the frontend uses residentId)
  residentId: r.resident_id,
  residentCode: r.resident_code ?? null,
  room: r.room ?? null,
  category: r.category,
  dueAt: r.due_at,
  assignedTo: r.assigned_to,
  assignedToName: r.assigned_name ?? null,
  status: statusOf(r), // 'pending' | 'completed' | 'skipped' | 'overdue'
  skipReason: r.skip_reason,
  note: r.note,
  done: r.status === 'completed',
  doneAt: r.done_at,
  completedBy: r.completed_by ? { _id: r.completed_by, id: r.completed_by, name: r.completed_name } : null,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

const findTask = async (id) => (await pool.query(`${SELECT_TASKS} WHERE t.id = ?`, [id]))[0][0];

// A caregiver may only change tasks given to them (or not given to anyone yet). Admins: any.
const canWork = (user, task) => user.role === 'admin' || task.assigned_to === null || task.assigned_to === user.id;

// Checks resident / caregiver / category / due date sent by the admin.
// Returns { error } or the clean values.
async function readTaskFields(b, existing = null) {
  const has = (key) => Object.prototype.hasOwnProperty.call(b, key);
  const out = {};

  if (!existing || has('task')) {
    out.task = clean(b.task, 120);
    if (!out.task) return { error: 'Task name is required.' };
  }
  if (!existing || has('dueAt')) {
    if (!b.dueAt || isNaN(new Date(b.dueAt))) return { error: 'A valid due date is required.' };
    out.due_at = new Date(b.dueAt);
  }

  // Resident: by id (new way) or by name (old way, still accepted)
  if (has('residentId') && b.residentId) {
    const [[r]] = await pool.query('SELECT id, name FROM residents WHERE id = ?', [b.residentId]);
    if (!r) return { error: 'Resident not found.' };
    out.resident_id = r.id;
    out.resident = r.name;
  } else if (has('resident')) {
    out.resident = clean(b.resident, 80);
    if (!out.resident) return { error: 'Resident is required.' };
    const [[r]] = await pool.query('SELECT id FROM residents WHERE name = ? LIMIT 1', [out.resident]);
    out.resident_id = r?.id ?? null;
  } else if (!existing) {
    return { error: 'Resident is required.' };
  }

  if (has('category')) {
    if (b.category && !CATEGORIES.includes(b.category)) return { error: `Category must be one of: ${CATEGORIES.join(', ')}.` };
    out.category = b.category || null;
  }
  if (has('assignedTo')) {
    if (b.assignedTo) {
      const [[u]] = await pool.query("SELECT id FROM users WHERE id = ? AND role = 'caregiver' AND status = 'active'", [b.assignedTo]);
      if (!u) return { error: 'That caregiver was not found or is not active.' };
      out.assigned_to = u.id;
    } else {
      out.assigned_to = null;
    }
  }
  if (has('note')) out.note = clean(b.note, 2000);
  return { values: out };
}

// Tell a caregiver they have a new task (task name only, no resident details)
const tellAssigned = (task) =>
  task.assigned_to &&
  notifyLater([task.assigned_to], {
    type: 'task',
    title: `New task: ${task.task}`,
    body: 'Open AGAPAY to see the details.',
    link: `/tasks?open=${task.id}`,
    tag: `task-${task.id}`,
  });

// =====================================================================

// GET /api/tasks?mine=1&from=2026-10-01&to=2026-10-31&residentId=3&status=pending
// mine=1 -> only tasks assigned to me. from/to are dates (Philippine time) or full ISO times.
router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const q = req.query;

  if (q.mine === '1' || q.mine === 'true') {
    where.push('t.assigned_to = ?');
    params.push(req.user.id);
  } else if (q.assignedTo && req.user.role === 'admin') {
    where.push('t.assigned_to = ?');
    params.push(q.assignedTo);
  }

  // A date alone means the whole day in Philippine time
  const toMoment = (value, endOfDay) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}+08:00`);
    }
    return new Date(value);
  };
  if (q.from) {
    const from = toMoment(q.from, false);
    if (isNaN(from)) return res.status(400).json({ message: '`from` is not a valid date.' });
    where.push('t.due_at >= ?');
    params.push(from);
  }
  if (q.to) {
    const to = toMoment(q.to, true);
    if (isNaN(to)) return res.status(400).json({ message: '`to` is not a valid date.' });
    where.push('t.due_at <= ?');
    params.push(to);
  }
  if (q.residentId) {
    where.push('t.resident_id = ?');
    params.push(q.residentId);
  }
  if (q.status === 'overdue') {
    where.push("t.status = 'pending' AND t.due_at < NOW()");
  } else if (['pending', 'completed', 'skipped'].includes(q.status)) {
    where.push('t.status = ?');
    params.push(q.status);
  }

  const [rows] = await pool.query(
    `${SELECT_TASKS} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY t.due_at ASC, t.id ASC`,
    params
  );
  res.json(rows.map(toTask));
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(toTask(task));
});

// POST /api/tasks  (admin)  { task, dueAt, residentId or resident, category, assignedTo, note }
router.post('/', allowRoles('admin'), async (req, res) => {
  const { error, values } = await readTaskFields(req.body);
  if (error) return res.status(400).json({ message: error });

  const [result] = await pool.query('INSERT INTO tasks SET ?', [{ ...values, created_by: req.user.id }]);
  const task = await findTask(result.insertId);
  tellAssigned(task);
  res.status(201).json(toTask(task));
});

// PUT /api/tasks/:id  (admin)  change any of: task, dueAt, residentId/resident, category, assignedTo, note
router.put('/:id', allowRoles('admin'), async (req, res) => {
  const before = await findTask(req.params.id);
  if (!before) return res.status(404).json({ message: 'Task not found' });

  const { error, values } = await readTaskFields(req.body, before);
  if (error) return res.status(400).json({ message: error });
  if (Object.keys(values).length === 0) return res.json(toTask(before));

  // A new due date in the future may become overdue again later, so allow a new alert
  if (values.due_at && values.due_at > new Date()) values.overdue_notified_at = null;

  await pool.query('UPDATE tasks SET ? WHERE id = ?', [values, before.id]);
  const task = await findTask(before.id);
  if (values.assigned_to && values.assigned_to !== before.assigned_to) tellAssigned(task);
  res.json(toTask(task));
});

// PATCH /api/tasks/:id  { status, reason, note }
// status: 'completed' | 'skipped' (reason required) | 'pending' (undo). note can be sent alone.
router.patch('/:id', async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!canWork(req.user, task)) return res.status(403).json({ message: 'This task is assigned to someone else.' });

  const { status } = req.body;
  const changes = {};

  if (status !== undefined) {
    if (status === 'completed') {
      Object.assign(changes, { status, done: true, done_at: new Date(), completed_by: req.user.id, skip_reason: null });
    } else if (status === 'skipped') {
      const reason = clean(req.body.reason, 200);
      if (!reason) return res.status(400).json({ message: 'Please give a reason for skipping this task.' });
      Object.assign(changes, { status, done: false, done_at: new Date(), completed_by: req.user.id, skip_reason: reason });
    } else if (status === 'pending') {
      Object.assign(changes, { status, done: false, done_at: null, completed_by: null, skip_reason: null });
    } else {
      return res.status(400).json({ message: 'Status must be completed, skipped or pending.' });
    }
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'note')) changes.note = clean(req.body.note, 2000);
  if (Object.keys(changes).length === 0) return res.status(400).json({ message: 'Nothing to change.' });

  await pool.query('UPDATE tasks SET ? WHERE id = ?', [changes, task.id]);
  res.json(toTask(await findTask(task.id)));
});

// PATCH /api/tasks/:id/done  (old route, still works: same as status 'completed')
router.patch('/:id/done', async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (!canWork(req.user, task)) return res.status(403).json({ message: 'This task is assigned to someone else.' });

  await pool.query(
    "UPDATE tasks SET status = 'completed', done = TRUE, done_at = NOW(), completed_by = ?, skip_reason = NULL WHERE id = ?",
    [req.user.id, task.id]
  );
  res.json(toTask(await findTask(task.id)));
});

// DELETE /api/tasks/:id  (admins, or the person who created the task)
router.delete('/:id', async (req, res) => {
  const task = await findTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
    return res.status(403).json({ message: 'Only an administrator can delete this task.' });
  }
  await pool.query('DELETE FROM tasks WHERE id = ?', [task.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
