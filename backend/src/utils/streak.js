const Habit = require('../models/Habit');

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

// A day "counts" if the user logged at least 2 meals, drank >=1500ml water, or worked out.
function dayCounts(habit) {
  if (!habit) return false;
  return habit.meals >= 2 || habit.waterMl >= 1500 || habit.workoutDone;
}

async function recomputeStreak(userId) {
  const habits = await Habit.find({ user: userId }).sort({ date: -1 }).limit(60).lean();
  const byDate = new Map(habits.map((h) => [h.date, h]));

  let currentStreak = 0;
  const cursor = new Date();
  // Walk backwards from today until a day breaks the streak.
  for (let i = 0; i < 60; i++) {
    const dateStr = toDateStr(cursor);
    const habit = byDate.get(dateStr);
    if (dayCounts(habit)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let running = 0;
  const sortedAsc = [...habits].sort((a, b) => (a.date < b.date ? -1 : 1));
  let prevDate = null;
  for (const h of sortedAsc) {
    const counts = dayCounts(h);
    if (!counts) {
      running = 0;
      prevDate = h.date;
      continue;
    }
    if (prevDate) {
      const diffDays = (new Date(h.date) - new Date(prevDate)) / 86400000;
      running = diffDays === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }
    longestStreak = Math.max(longestStreak, running);
    prevDate = h.date;
  }

  const last7 = habits.slice(0, 7).filter(dayCounts).length;

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak), last7DaysGoalsMetCount: last7 };
}

module.exports = { recomputeStreak, dayCounts, toDateStr };
