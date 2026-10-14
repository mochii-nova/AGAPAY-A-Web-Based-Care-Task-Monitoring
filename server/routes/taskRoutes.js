const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Convert a DB row to the shape the React pages use, adding done / pending / overdue
const toTask = (r) => ({
  _id: r.id,
  id: r.id,
  resident: r.resident,
  task: r.task,
  dueAt: r.due_at,
  done: !!r.done,
  doneAt: r.done_at,
  status: r.done ? 'done' : new Date(r.due_at) < new Date() ? 'overdue' : 'pending',
});

// Get all tasks
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks ORDER BY due_at ASC');
    res.json(rows.map(toTask));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a task
router.post('/', protect, async (req, res) => {
  try {
    const { resident, task, dueAt } = req.body;
    if (!resident || !task || !dueAt || isNaN(new Date(dueAt))) {
      return res.status(400).json({ message: 'Resident, task and a valid due date are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO tasks (resident, task, due_at, created_by) VALUES (?, ?, ?, ?)',
      [resident, task, new Date(dueAt), req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json(toTask(rows[0]));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark a task done
router.patch('/:id/done', protect, async (req, res) => {
  try {
    const [found] = await pool.query('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (found.length === 0) return res.status(404).json({ message: 'Task not found' });

    await pool.query(
      'UPDATE tasks SET done = TRUE, done_at = NOW(), completed_by = ? WHERE id = ?',
      [req.user.id, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json(toTask(rows[0]));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a task (only if it's done)
router.delete('/:id', protect, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });
    if (!rows[0].done) return res.status(400).json({ message: 'Only done tasks can be deleted' });

    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
