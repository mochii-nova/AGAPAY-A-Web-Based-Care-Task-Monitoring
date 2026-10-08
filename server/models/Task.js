const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    resident: { type: String, required: true },
    task: { type: String, required: true },
    dueAt: { type: Date, required: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
