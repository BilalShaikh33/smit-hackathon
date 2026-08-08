const User = require('../models/User');
const { analyzeBodyImages } = require('../utils/aiService');

// 4.1 AI Onboarding (Body Analysis): accepts front/back/left/right images + basic stats,
// runs (simulated) MediaPipe pose/landmark analysis, and estimates BMI.
async function analyzeBody(req, res) {
  const files = req.files || {};
  const { heightCm, weightKg, age, gender } = req.body;

  const images = {};
  ['front', 'back', 'left', 'right'].forEach((key) => {
    if (files[key]?.[0]) images[key] = `/uploads/${files[key][0].filename}`;
  });
  if (Object.keys(images).length < 4) {
    return res.status(400).json({ message: 'All 4 images (front, back, left, right) are required' });
  }

  const analysis = analyzeBodyImages({ heightCm: Number(heightCm), weightKg: Number(weightKg) });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        'profile.heightCm': Number(heightCm),
        'profile.weightKg': Number(weightKg),
        'profile.age': age ? Number(age) : undefined,
        'profile.gender': gender,
        bodyAnalysis: { images, ...analysis, analyzedAt: new Date() },
      },
    },
    { new: true }
  );

  res.json({ bodyAnalysis: user.bodyAnalysis, profile: user.profile });
}

// 4.2 Goal Selection
async function selectGoal(req, res) {
  const { goal, activityLevel, allergies, dietaryPreference, environment } = req.body;
  const validGoals = ['weight_loss', 'weight_gain', 'muscle_gain', 'maintenance'];
  if (!validGoals.includes(goal)) return res.status(400).json({ message: `goal must be one of ${validGoals.join(', ')}` });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        'profile.goal': goal,
        'profile.activityLevel': activityLevel || 'moderate',
        'profile.allergies': Array.isArray(allergies) ? allergies : allergies ? [allergies] : [],
        'profile.dietaryPreference': dietaryPreference || 'none',
        'profile.environment': environment || 'home',
      },
    },
    { new: true }
  );

  res.json({ profile: user.profile });
}

module.exports = { analyzeBody, selectGoal };
