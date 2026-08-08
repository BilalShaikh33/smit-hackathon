const Progress = require('../models/Progress');
const User = require('../models/User');
const { analyzeProgressInsights } = require('../utils/aiService');
const { toDateStr } = require('../utils/streak');

function mondayOf(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

// 4.7 Weekly Progress Tracking: photo comparison + AI insights vs. previous week.
async function logProgress(req, res) {
  const { weightKg } = req.body;
  const files = req.files || {};
  const weekOf = mondayOf(toDateStr(new Date()));

  const photos = {};
  ['front', 'back', 'left', 'right'].forEach((key) => {
    if (files[key]?.[0]) photos[key] = `/uploads/${files[key][0].filename}`;
  });

  const previous = await Progress.findOne({ user: req.user._id, weekOf: { $lt: weekOf } }).sort({ weekOf: -1 });

  const aiInsights = analyzeProgressInsights({
    previousWeightKg: previous?.weightKg,
    currentWeightKg: Number(weightKg),
    goal: req.user.profile?.goal,
  });

  const entry = await Progress.findOneAndUpdate(
    { user: req.user._id, weekOf },
    {
      $set: {
        weightKg: Number(weightKg),
        ...(Object.keys(photos).length ? { photos } : {}),
        aiInsights,
        weightDeltaKg: previous ? Number((weightKg - previous.weightKg).toFixed(1)) : 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (weightKg) await User.findByIdAndUpdate(req.user._id, { $set: { 'profile.weightKg': Number(weightKg) } });

  res.status(201).json({ entry, previous });
}

async function getProgress(req, res) {
  const entries = await Progress.find({ user: req.user._id }).sort({ weekOf: -1 }).limit(12);
  res.json({ entries });
}

module.exports = { logProgress, getProgress };
