const express = require('express');
const Handover = require('../models/Handover');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Get all handovers
router.get('/', protect, async (req, res) => {
  const list = await Handover.find()
    .populate('author', 'name role')
    .populate('acknowledgedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(list);
});

// Submit a handover 
router.post('/', protect, async (req, res) => {
  try {
    const { shift, notes } = req.body;
    const created = await Handover.create({ shift, notes, author: req.user.id });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Acknowledge a handover 
router.patch('/:id/acknowledge', protect, async (req, res) => {
  const h = await Handover.findById(req.params.id);
  if (!h) return res.status(404).json({ message: 'Handover not found' });

  if (String(h.author) === req.user.id) {
    return res.status(400).json({ message: 'You cannot acknowledge your own handover' });
  }

  h.acknowledgedBy = req.user.id;
  h.acknowledgedAt = new Date();
  await h.save();
  res.json(h);
});

module.exports = router;