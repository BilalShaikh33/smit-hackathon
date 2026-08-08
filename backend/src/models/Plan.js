const mongoose = require('../db/adapter');

const planSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['diet', 'workout'], required: true },
    goal: String,

    // Diet plan shape: { dailyCalories, macros: {protein,carbs,fats}, meals: [{name, items, calories}] }
    // Workout plan shape: { split: [{day, focus, exercises: [{name, sets, reps}]}] }
    content: { type: mongoose.Schema.Types.Mixed, required: true },

    source: { type: String, enum: ['ai', 'admin_edited', 'admin_manual'], default: 'ai' },
    isTemplate: { type: Boolean, default: false },
    templateName: String,

    flagged: { type: Boolean, default: false },
    flagReason: String,

    active: { type: Boolean, default: true },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
