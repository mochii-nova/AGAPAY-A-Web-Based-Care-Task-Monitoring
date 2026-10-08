const mongoose = require('mongoose');

const handoverSchema = new mongoose.Schema(
  {
    shift: { type: String, enum: ['Morning', 'Afternoon', 'Night'], required: true },
    notes: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Handover', handoverSchema);
