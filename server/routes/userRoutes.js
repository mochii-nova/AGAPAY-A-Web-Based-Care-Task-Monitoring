const express = require('express');
const User = require('../models/User');
const { protect, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// List all staff (admin only)
router.get('/', protect, allowRoles('admin'), async (req, res) => {
  const users = await User.find().select('-password').sort({ name: 1 });
  res.json(users);
});

// Remove a staff account (admin only)
router.delete('/:id', protect, allowRoles('admin'), async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Staff removed' });
});

module.exports = router;
