const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');
const { notifyLater, idsWithRole } = require('../utils/notify');
const { clean } = require('../utils/users');
const { SHIFT_LABEL, isShift, isDate, shiftAt, nextShift } = require('../utils/shifts');

const router = express.Router();
router.use(protect);

const RESIDENT_STATUSES = ['normal', 'watch', 'urgent'];

const SELECT_HANDOVERS = `
  SELECT h.*, a.name AS author_name, a.role AS author_role, k.name AS ack_name
  FROM handovers h
  JOIN users a      ON a.id = h.author_id
  LEFT JOIN users k ON k.id = h.acknowledged_by
`;

// Turns handover rows into the shape the frontend expects, with the resident updates,
// passed-on tasks and read receipts (3 queries for the whole list, not 3 per handover).
async function toHandovers(rows, me) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [residents] = await pool.query(
    `SELECT u.*, r.name, r.room, r.resident_code FROM handover_resident_updates u
     JOIN residents r ON r.id = u.resident_id WHERE u.handover_id IN (?) ORDER BY r.room, r.name`,
    [ids]
  );
  const [tasks] = await pool.query(
    `SELECT c.*, t.task, t.resident, t.due_at, t.status AS task_status FROM handover_carried_tasks c
     JOIN tasks t ON t.id = c.task_id WHERE c.handover_id IN (?) ORDER BY t.due_at`,
    [ids]
  );
  const [reads] = await pool.query(
    `SELECT hr.*, u.name FROM handover_reads hr JOIN users u ON u.id = hr.user_id
     WHERE hr.handover_id IN (?) ORDER BY hr.read_at`,
    [ids]
  );

  return rows.map((r) => {
    const myReads = reads.filter((x) => x.handover_id === r.id);
    return {
      _id: r.id,
      id: r.id,
      shift: r.shift,
      shiftDate: r.shift_date,
      status: r.status, // 'draft' | 'submitted'
      notes: r.notes, // old handovers: everything is in here
      summary: r.summary,
      otherNotes: r.other_notes,
      residents: residents
        .filter((x) => x.handover_id === r.id)
        .map((x) => ({ residentId: x.resident_id, name: x.name, room: x.room, residentCode: x.resident_code, status: x.status, note: x.note })),
      tasks: tasks
        .filter((x) => x.handover_id === r.id)
        .map((x) => ({ taskId: x.task_id, task: x.task, resident: x.resident, dueAt: x.due_at, taskStatus: x.task_status, note: x.note })),
      createdAt: r.created_at,
      submittedAt: r.submitted_at,
      author: { _id: r.author_id, id: r.author_id, name: r.author_name, role: r.author_role },
      // The first reader (kept for the current pages)
      acknowledgedBy: r.acknowledged_by ? { _id: r.acknowledged_by, id: r.acknowledged_by, name: r.ack_name } : null,
      acknowledgedAt: r.acknowledged_at,
      // Everyone who has read it
      reads: myReads.map((x) => ({ userId: x.user_id, name: x.name, readAt: x.read_at })),
      readByMe: myReads.some((x) => x.user_id === me.id),
    };
  });
}

const findOne = async (where, params, me) => {
  const [rows] = await pool.query(`${SELECT_HANDOVERS} WHERE ${where}`, params);
  return rows.length ? (await toHandovers(rows, me))[0] : null;
};

// Checks the body of a draft or a submit. Returns { error } or the clean values.
// Accepts the new format { shift, shiftDate, summary, residents, tasks, otherNotes }
// and the old one { shift, notes }.
async function readBody(b, { forSubmit }) {
  const now = shiftAt();
  const shift = b.shift ?? now.shift;
  const shiftDate = b.shiftDate ?? now.shiftDate;
  if (!isShift(shift)) return { error: 'Shift must be Morning, Afternoon or Night.' };
  if (!isDate(shiftDate)) return { error: 'shiftDate must look like 2026-10-31.' };

  const summary = clean(b.summary, 5000);
  const otherNotes = clean(b.otherNotes, 5000);
  const residents = Array.isArray(b.residents) ? b.residents : [];
  const tasks = Array.isArray(b.tasks) ? b.tasks : [];

  for (const r of residents) {
    if (!r || !Number(r.residentId)) return { error: 'Each resident needs a residentId.' };
    if (r.status && !RESIDENT_STATUSES.includes(r.status)) return { error: 'Resident status must be normal, watch or urgent.' };
  }
  for (const t of tasks) {
    if (!t || !Number(t.taskId)) return { error: 'Each passed-on task needs a taskId.' };
  }

  // Only keep residents and tasks that exist
  const residentIds = [...new Set(residents.map((r) => Number(r.residentId)))];
  const taskIds = [...new Set(tasks.map((t) => Number(t.taskId)))];
  const [foundR] = residentIds.length ? await pool.query('SELECT id, name FROM residents WHERE id IN (?)', [residentIds]) : [[]];
  const [foundT] = taskIds.length ? await pool.query('SELECT id, task, resident FROM tasks WHERE id IN (?)', [taskIds]) : [[]];
  if (foundR.length !== residentIds.length) return { error: 'One of the residents was not found.' };
  if (foundT.length !== taskIds.length) return { error: 'One of the passed-on tasks was not found.' };

  const residentRows = residentIds.map((id) => {
    const sent = residents.find((r) => Number(r.residentId) === id);
    return { id, name: foundR.find((x) => x.id === id).name, status: sent.status || 'normal', note: clean(sent.note, 2000) };
  });
  const taskRows = taskIds.map((id) => {
    const t = foundT.find((x) => x.id === id);
    return { id, task: t.task, resident: t.resident, note: clean(tasks.find((x) => Number(x.taskId) === id).note, 2000) };
  });

  // `notes` keeps a readable copy, so old screens and exports still show something useful
  let notes = typeof b.notes === 'string' ? b.notes.trim() : '';
  if (!notes) {
    const lines = [`${SHIFT_LABEL[shift]} shift handover (${shiftDate}).`];
    if (summary) lines.push(summary);
    if (taskRows.length) lines.push('Passed on:', ...taskRows.map((t) => `- ${t.task} (${t.resident})${t.note ? `: ${t.note}` : ''}`));
    const flagged = residentRows.filter((r) => r.status !== 'normal' || r.note);
    if (flagged.length) lines.push('Residents:', ...flagged.map((r) => `- ${r.name}: ${r.status}${r.note ? `. ${r.note}` : ''}`));
    if (otherNotes) lines.push(`Other notes: ${otherNotes}`);
    notes = lines.join('\n');
  }

  const wroteNotes = typeof b.notes === 'string' && b.notes.trim();
  if (forSubmit && !summary && !otherNotes && !residentRows.length && !taskRows.length && !wroteNotes) {
    return { error: 'Please write something in the handover.' };
  }

  return { shift, shiftDate, summary, otherNotes, notes, residentRows, taskRows };
}

// Saves the resident updates and passed-on tasks of one handover (replacing what was there)
async function saveDetails(conn, handoverId, v) {
  await conn.query('DELETE FROM handover_resident_updates WHERE handover_id = ?', [handoverId]);
  await conn.query('DELETE FROM handover_carried_tasks WHERE handover_id = ?', [handoverId]);
  if (v.residentRows.length) {
    await conn.query('INSERT INTO handover_resident_updates (handover_id, resident_id, status, note) VALUES ?', [
      v.residentRows.map((r) => [handoverId, r.id, r.status, r.note]),
    ]);
  }
  if (v.taskRows.length) {
    await conn.query('INSERT INTO handover_carried_tasks (handover_id, task_id, note) VALUES ?', [
      v.taskRows.map((t) => [handoverId, t.id, t.note]),
    ]);
  }
}

// Runs fn(conn) inside a transaction
async function inTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Who to tell about a new handover: the caregivers on the next shift (from the roster),
// or every caregiver if nobody is on the roster yet. Admins always.
async function handoverRecipients(h, authorId) {
  const next = nextShift(h.shift, h.shiftDate);
  const [onNext] = await pool.query(
    "SELECT s.user_id FROM shifts s JOIN users u ON u.id = s.user_id WHERE s.shift_date = ? AND s.shift = ? AND u.status = 'active' AND s.user_id <> ?",
    [next.shiftDate, next.shift, authorId]
  );
  const caregivers = onNext.length ? onNext.map((r) => r.user_id) : await idsWithRole('caregiver', authorId);
  const admins = await idsWithRole('admin', authorId);
  return [...caregivers, ...admins];
}

// =====================================================================
//  Drafts (autosave). These come before /:id.
// =====================================================================

// GET /api/handovers/draft  ->  my draft, or null
router.get('/draft', async (req, res) => {
  const draft = await findOne("h.author_id = ? AND h.status = 'draft' ORDER BY h.id DESC LIMIT 1", [req.user.id], req.user);
  res.json(draft);
});

// PUT /api/handovers/draft  same body as POST. Saves or replaces my draft.
router.put('/draft', async (req, res) => {
  const v = await readBody(req.body, { forSubmit: false });
  if (v.error) return res.status(400).json({ message: v.error });

  const id = await inTransaction(async (conn) => {
    const [[existing]] = await conn.query(
      "SELECT id FROM handovers WHERE author_id = ? AND status = 'draft' ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [req.user.id]
    );
    let draftId = existing?.id;
    const fields = { shift: v.shift, shift_date: v.shiftDate, summary: v.summary, other_notes: v.otherNotes, notes: v.notes };
    if (draftId) {
      await conn.query('UPDATE handovers SET ? WHERE id = ?', [fields, draftId]);
    } else {
      const [result] = await conn.query('INSERT INTO handovers SET ?', [{ ...fields, author_id: req.user.id, status: 'draft' }]);
      draftId = result.insertId;
    }
    await saveDetails(conn, draftId, v);
    return draftId;
  });

  res.json(await findOne('h.id = ?', [id], req.user));
});

// DELETE /api/handovers/draft  ->  throw my draft away
router.delete('/draft', async (req, res) => {
  await pool.query("DELETE FROM handovers WHERE author_id = ? AND status = 'draft'", [req.user.id]);
  res.json({ message: 'Draft deleted' });
});

// =====================================================================
//  Submitted handovers
// =====================================================================

// GET /api/handovers?shiftDate=2026-10-25&limit=50  ->  newest first (drafts never included)
router.get('/', async (req, res) => {
  const where = ["h.status = 'submitted'"];
  const params = [];
  if (req.query.shiftDate) {
    if (!isDate(req.query.shiftDate)) return res.status(400).json({ message: 'shiftDate must look like 2026-10-31.' });
    where.push('h.shift_date = ?');
    params.push(req.query.shiftDate);
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const [rows] = await pool.query(
    `${SELECT_HANDOVERS} WHERE ${where.join(' AND ')} ORDER BY COALESCE(h.submitted_at, h.created_at) DESC, h.id DESC LIMIT ${limit}`,
    params
  );
  res.json(await toHandovers(rows, req.user));
});

// GET /api/handovers/:id
router.get('/:id', async (req, res) => {
  const h = await findOne("h.id = ? AND h.status = 'submitted'", [req.params.id], req.user);
  if (!h) return res.status(404).json({ message: 'Handover not found' });
  res.json(h);
});

// POST /api/handovers  submit
// { shift, shiftDate, summary, residents: [{ residentId, status, note }], tasks: [{ taskId, note }], otherNotes }
// (the old { shift, notes } still works). My draft, if any, becomes this handover.
router.post('/', async (req, res) => {
  const v = await readBody(req.body, { forSubmit: true });
  if (v.error) return res.status(400).json({ message: v.error });

  const id = await inTransaction(async (conn) => {
    const [[draft]] = await conn.query(
      "SELECT id FROM handovers WHERE author_id = ? AND status = 'draft' ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [req.user.id]
    );
    const fields = {
      shift: v.shift,
      shift_date: v.shiftDate,
      summary: v.summary,
      other_notes: v.otherNotes,
      notes: v.notes,
      status: 'submitted',
      submitted_at: new Date(),
    };
    let handoverId = draft?.id;
    if (handoverId) {
      // created_at follows the submit time, so "on time / late" is judged correctly
      await conn.query('UPDATE handovers SET ?, created_at = NOW() WHERE id = ?', [fields, handoverId]);
    } else {
      const [result] = await conn.query('INSERT INTO handovers SET ?', [{ ...fields, author_id: req.user.id }]);
      handoverId = result.insertId;
    }
    await saveDetails(conn, handoverId, v);
    return handoverId;
  });

  const handover = await findOne('h.id = ?', [id], req.user);

  // Tell the next shift. No resident names in the pop-up, just a count.
  const flagged = v.residentRows.filter((r) => r.status !== 'normal').length;
  notifyLater(handoverRecipients(handover, req.user.id), {
    type: 'handover',
    title: `New handover from ${SHIFT_LABEL[v.shift]} shift`,
    body: flagged ? `${flagged} resident${flagged === 1 ? '' : 's'} to watch closely` : 'Open AGAPAY to read it.',
    link: '/handover',
    tag: 'handover',
  });

  res.status(201).json(handover);
});

// PATCH /api/handovers/:id/acknowledge  ->  adds my read receipt
// The first reader is also kept in acknowledged_by, and is never overwritten.
router.patch('/:id/acknowledge', async (req, res) => {
  const [[found]] = await pool.query("SELECT * FROM handovers WHERE id = ? AND status = 'submitted'", [req.params.id]);
  if (!found) return res.status(404).json({ message: 'Handover not found' });
  if (found.author_id === req.user.id) {
    return res.status(400).json({ message: 'You cannot acknowledge your own handover' });
  }

  await pool.query('INSERT IGNORE INTO handover_reads (handover_id, user_id) VALUES (?, ?)', [found.id, req.user.id]);
  await pool.query(
    'UPDATE handovers SET acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ? AND acknowledged_by IS NULL',
    [req.user.id, found.id]
  );
  res.json(await findOne('h.id = ?', [found.id], req.user));
});

module.exports = router;
