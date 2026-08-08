const Habit = require('../models/Habit');
const Progress = require('../models/Progress');
const Plan = require('../models/Plan');

// 4.8 Dashboard: weight, calories, streaks, fitness score, at a glance.
async function getDashboard(req, res) {
  const user = req.user;

  const [latestProgress, dietPlan, last7Habits] = await Promise.all([
    Progress.findOne({ user: user._id }).sort({ weekOf: -1 }),
    Plan.findOne({ user: user._id, type: 'diet', active: true }).sort({ createdAt: -1 }),
    Habit.find({ user: user._id }).sort({ date: -1 }).limit(7),
  ]);

  res.json({
    weightKg: latestProgress?.weightKg ?? user.profile?.weightKg ?? null,
    weightDeltaKg: latestProgress?.weightDeltaKg ?? 0,
    dailyCalorieTarget: dietPlan?.content?.dailyCalories ?? null,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    fitnessScore: user.fitnessScore,
    goal: user.profile?.goal,
    bmi: user.bodyAnalysis?.estimatedBMI ?? null,
    bmiCategory: user.bodyAnalysis?.bmiCategory ?? null,
    last7Habits,
  });
}

module.exports = { getDashboard };
