const express = require('express');
const pool = require('../db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

const SELECT_HANDOVERS = `
  SELECT h.*, a.name AS author_name, a.role AS author_role, k.name AS ack_name
  FROM handovers h
  JOIN users a      ON a.id = h.author_id
  LEFT JOIN users k ON k.id = h.acknowledged_by
`;

// Convert a DB row to the shape Handover.jsx expects
const toHandover = (r) => ({
  _id: r.id,
  id: r.id,
  shift: r.shift,
  notes: r.notes,
  createdAt: r.created_at,
  author: { _id: r.author_id, name: r.author_name, role: r.author_role },
  acknowledgedBy: r.acknowledged_by ? { _id: r.acknowledged_by, name: r.ack_name } : null,
  acknowledgedAt: r.acknowledged_at,
});

// Get all handovers, newest first
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_HANDOVERS} ORDER BY h.created_at DESC, h.id DESC`);
    res.json(rows.map(toHandover));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit a handover (outgoing shift)
router.post('/', protect, async (req, res) => {
  try {
    const { shift, notes } = req.body;
    if (!['Morning', 'Afternoon', 'Night'].includes(shift) || !notes) {
      return res.status(400).json({ message: 'Shift and notes are required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO handovers (shift, notes, author_id) VALUES (?, ?, ?)',
      [shift, notes, req.user.id]
    );
    const [rows] = await pool.query(`${SELECT_HANDOVERS} WHERE h.id = ?`, [result.insertId]);
    res.status(201).json(toHandover(rows[0]));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Acknowledge a handover (incoming shift)
router.patch('/:id/acknowledge', protect, async (req, res) => {
  try {
    const [found] = await pool.query('SELECT * FROM handovers WHERE id = ?', [req.params.id]);
    if (found.length === 0) return res.status(404).json({ message: 'Handover not found' });

    if (found[0].author_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot acknowledge your own handover' });
    }

    await pool.query(
      'UPDATE handovers SET acknowledged_by = ?, acknowledged_at = NOW() WHERE id = ?',
      [req.user.id, req.params.id]
    );
    const [rows] = await pool.query(`${SELECT_HANDOVERS} WHERE h.id = ?`, [req.params.id]);
    res.json(toHandover(rows[0]));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
