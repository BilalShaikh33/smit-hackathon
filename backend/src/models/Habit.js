const mongoose = require('../db/adapter');

const habitSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD, one doc per user per day

    meals: { type: Number, default: 0 }, // meals logged
    waterMl: { type: Number, default: 0 },
    workoutDone: { type: Boolean, default: false },
    sleepHours: { type: Number, default: 0 },

    goalsMet: { type: Boolean, default: false }, // computed: did the day count toward the streak
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Habit', habitSchema);
