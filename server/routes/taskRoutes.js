const express = require('express');
const Task = require('../models/Task');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Adds a status to each task: done / pending / overdue
const withStatus = (t) => {
  const obj = t.toObject();
  if (obj.done) obj.status = 'done';
  else if (new Date(obj.dueAt) < new Date()) obj.status = 'overdue';
  else obj.status = 'pending';
  return obj;
};

// Get all tasks
router.get('/', protect, async (req, res) => {
  const tasks = await Task.find().sort({ dueAt: 1 });
  res.json(tasks.map(withStatus));
});

// Add a task
router.post('/', protect, async (req, res) => {
  try {
    const { resident, task, dueAt } = req.body;
    const created = await Task.create({ resident, task, dueAt, createdBy: req.user.id });
    res.status(201).json(withStatus(created));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark a task done
router.patch('/:id/done', protect, async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Task not found' });

  t.done = true;
  t.doneAt = new Date();
  t.completedBy = req.user.id;
  await t.save();
  res.json(withStatus(t));
});

// Delete a task (only if it's done)
router.delete('/:id', protect, async (req, res) => {
  const t = await Task.findById(req.params.id);
  if (!t) return res.status(404).json({ message: 'Task not found' });
  if (!t.done) return res.status(400).json({ message: 'Only done tasks can be deleted' });

  await t.deleteOne();
  res.json({ message: 'Task deleted' });
});

module.exports = router;
