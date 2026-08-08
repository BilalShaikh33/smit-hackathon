const mongoose = require('../db/adapter');

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekOf: { type: String, required: true }, // YYYY-MM-DD (Monday of that week)
    weightKg: Number,
    photos: {
      front: String,
      back: String,
      left: String,
      right: String,
    },
    aiInsights: String,
    weightDeltaKg: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Progress', progressSchema);
