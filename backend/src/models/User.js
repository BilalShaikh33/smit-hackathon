const mongoose = require('../db/adapter');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    status: { type: String, enum: ['active', 'banned', 'deactivated'], default: 'active' },

    profile: {
      age: Number,
      gender: { type: String, enum: ['male', 'female', 'other'] },
      heightCm: Number,
      weightKg: Number,
      goal: { type: String, enum: ['weight_loss', 'weight_gain', 'muscle_gain', 'maintenance'] },
      activityLevel: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'], default: 'moderate' },
      allergies: [{ type: String }],
      dietaryPreference: { type: String, default: 'none' },
      environment: { type: String, enum: ['home', 'gym'], default: 'home' },
    },

    bodyAnalysis: {
      images: {
        front: String,
        back: String,
        left: String,
        right: String,
      },
      posture: String,
      landmarksDetected: Number,
      estimatedBMI: Number,
      bmiCategory: String,
      analyzedAt: Date,
    },

    fitnessScore: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastLogin: Date,

    chatBlocked: { type: Boolean, default: false },
    banReason: String,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
