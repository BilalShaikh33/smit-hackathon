const Habit = require('../models/Habit');
const User = require('../models/User');
const { recomputeStreak, toDateStr, dayCounts } = require('../utils/streak');
const { computeFitnessScore } = require('../utils/fitnessScore');

async function refreshUserScore(userId) {
  const { currentStreak, longestStreak, last7DaysGoalsMetCount } = await recomputeStreak(userId);
  const user = await User.findById(userId);
  const fitnessScore = computeFitnessScore({
    currentStreak,
    last7DaysGoalsMetCount,
    bmi: user.bodyAnalysis?.estimatedBMI,
  });
  user.currentStreak = currentStreak;
  user.longestStreak = longestStreak;
  user.fitnessScore = fitnessScore;
  await user.save();
  return { currentStreak, longestStreak, fitnessScore };
}

// 4.5 Daily Habit Tracker: log meals, water, workout, sleep for "today" (or a given date).
async function logHabit(req, res) {
  const { date, meals, waterMl, workoutDone, sleepHours } = req.body;
  const dateStr = date || toDateStr(new Date());

  const update = {};
  if (meals !== undefined) update.meals = Number(meals);
  if (waterMl !== undefined) update.waterMl = Number(waterMl);
  if (workoutDone !== undefined) update.workoutDone = Boolean(workoutDone);
  if (sleepHours !== undefined) update.sleepHours = Number(sleepHours);

  let habit = await Habit.findOneAndUpdate(
    { user: req.user._id, date: dateStr },
    { $set: update, $setOnInsert: { user: req.user._id, date: dateStr } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  habit.goalsMet = dayCounts(habit);
  await habit.save();

  const streakInfo = await refreshUserScore(req.user._id);

  const io = req.app.get('io');
  io?.to(`user:${req.user._id}`).emit('habit:update', { habit, ...streakInfo });

  res.json({ habit, ...streakInfo });
}

async function getHabits(req, res) {
  const habits = await Habit.find({ user: req.user._id }).sort({ date: -1 }).limit(30);
  res.json({ habits, currentStreak: req.user.currentStreak, longestStreak: req.user.longestStreak });
}

module.exports = { logHabit, getHabits, refreshUserScore };
