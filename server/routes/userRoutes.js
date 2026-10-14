const express = require('express');
const pool = require('../db');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// List all staff (admin only)
router.get('/', protect, allowRoles('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, username, role FROM users ORDER BY name ASC');
    res.json(rows.map((u) => ({ _id: u.id, id: u.id, name: u.name, username: u.username, role: u.role })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Remove a staff account (admin only)
router.delete('/:id', protect, allowRoles('admin'), async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Staff removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
