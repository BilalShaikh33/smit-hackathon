// Fitness score (0-100): blends habit consistency, streak, and BMI proximity to a healthy range.
function computeFitnessScore({ currentStreak = 0, last7DaysGoalsMetCount = 0, bmi = null }) {
  const streakScore = Math.min(currentStreak * 4, 40); // up to 40 pts, caps at a 10-day streak
  const consistencyScore = Math.min(last7DaysGoalsMetCount, 7) * (30 / 7); // up to 30 pts

  let bmiScore = 15; // neutral default when BMI unknown
  if (typeof bmi === 'number' && bmi > 0) {
    const distanceFromIdeal = Math.abs(bmi - 21.5); // 21.5 = midpoint of healthy BMI range
    bmiScore = Math.max(0, 30 - distanceFromIdeal * 3);
  }

  const score = Math.round(streakScore + consistencyScore + bmiScore);
  return Math.max(0, Math.min(100, score));
}

module.exports = { computeFitnessScore };
