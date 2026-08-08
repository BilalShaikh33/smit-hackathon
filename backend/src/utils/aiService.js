// AI Layer: diet/workout generation + RAG chatbot.
// Uses a real LLM when a key is configured (OpenAI first, then Groq — both speak the
// same OpenAI-compatible chat-completions format); otherwise falls back to a
// deterministic rule-based generator so the whole product works fully offline for the demo.
const SystemLog = require('../models/SystemLog');

// Groq's API is OpenAI-compatible (same request/response shape), just a different
// base URL, key, and model catalog — https://console.groq.com/docs/openai
function getProvider() {
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      name: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    };
  }
  return null;
}

const HAS_OPENAI = () => Boolean(getProvider());

async function logAIUsage(meta) {
  try {
    await SystemLog.create({ type: 'ai_usage', message: meta.endpoint, meta });
  } catch (_) {}
}

async function callOpenAI(messages, { endpoint = 'chat' } = {}) {
  const provider = getProvider();
  const res = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({ model: provider.model, messages, temperature: 0.7 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${provider.name} request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  await logAIUsage({
    endpoint,
    provider: provider.name,
    model: provider.model,
    tokensUsed: data.usage?.total_tokens || null,
    promptTokens: data.usage?.prompt_tokens || null,
    completionTokens: data.usage?.completion_tokens || null,
  });
  return data.choices[0].message.content;
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

function estimateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function calorieTarget(profile) {
  const { age = 28, gender = 'male', heightCm = 170, weightKg = 70, activityLevel = 'moderate', goal = 'maintenance' } = profile;
  // Mifflin-St Jeor BMR
  const bmr = gender === 'female'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;

  const activityMultiplier = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 }[activityLevel] || 1.55;
  let tdee = bmr * activityMultiplier;

  if (goal === 'weight_loss') tdee -= 450;
  if (goal === 'weight_gain' || goal === 'muscle_gain') tdee += 350;

  return Math.max(1200, Math.round(tdee));
}

const FOOD_BANK = {
  breakfast: [
    { name: 'Oats with banana & peanut butter', tags: [], cals: 420, protein: 15, carbs: 60, fats: 14 },
    { name: 'Egg whites veggie omelette with toast', tags: ['dairy_free'], cals: 380, protein: 28, carbs: 30, fats: 14 },
    { name: 'Greek yogurt with berries & honey', tags: [], cals: 320, protein: 20, carbs: 40, fats: 8, allergens: ['dairy'] },
    { name: 'Chickpea flour pancakes with fruit', tags: ['gluten_free', 'vegan'], cals: 400, protein: 16, carbs: 55, fats: 12 },
  ],
  lunch: [
    { name: 'Grilled chicken, brown rice & steamed veggies', tags: [], cals: 620, protein: 45, carbs: 65, fats: 16 },
    { name: 'Paneer tikka bowl with quinoa', tags: ['vegetarian'], cals: 580, protein: 30, carbs: 60, fats: 20, allergens: ['dairy'] },
    { name: 'Lentil dal, roti & salad', tags: ['vegan'], cals: 540, protein: 24, carbs: 80, fats: 10, allergens: ['gluten'] },
    { name: 'Grilled fish, sweet potato & greens', tags: ['pescatarian'], cals: 560, protein: 40, carbs: 55, fats: 14, allergens: ['fish'] },
  ],
  dinner: [
    { name: 'Stir-fried tofu & vegetables with rice', tags: ['vegan'], cals: 500, protein: 22, carbs: 65, fats: 12, allergens: ['soy'] },
    { name: 'Grilled turkey breast with roasted vegetables', tags: [], cals: 480, protein: 42, carbs: 30, fats: 15 },
    { name: 'Chickpea & spinach curry with rice', tags: ['vegan'], cals: 520, protein: 20, carbs: 75, fats: 10 },
    { name: 'Baked salmon with asparagus', tags: ['pescatarian'], cals: 540, protein: 38, carbs: 20, fats: 26, allergens: ['fish'] },
  ],
  snack: [
    { name: 'Mixed nuts & an apple', tags: [], cals: 220, protein: 6, carbs: 24, fats: 12, allergens: ['nuts'] },
    { name: 'Protein shake', tags: [], cals: 180, protein: 24, carbs: 10, fats: 3, allergens: ['dairy'] },
    { name: 'Hummus with carrot sticks', tags: ['vegan'], cals: 200, protein: 7, carbs: 22, fats: 9 },
    { name: 'Roasted chickpeas', tags: ['vegan', 'gluten_free'], cals: 190, protein: 9, carbs: 26, fats: 5 },
  ],
};

function pickSafeItem(bank, allergies = []) {
  const lowerAllergies = allergies.map((a) => a.toLowerCase());
  const safe = bank.filter((item) => !(item.allergens || []).some((a) => lowerAllergies.includes(a)));
  const pool = safe.length ? safe : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

function ruleBasedDietPlan(profile) {
  const { allergies = [], goal = 'maintenance' } = profile;
  const targetCalories = calorieTarget(profile);

  const meals = [
    { slot: 'Breakfast', ...pickSafeItem(FOOD_BANK.breakfast, allergies) },
    { slot: 'Lunch', ...pickSafeItem(FOOD_BANK.lunch, allergies) },
    { slot: 'Snack', ...pickSafeItem(FOOD_BANK.snack, allergies) },
    { slot: 'Dinner', ...pickSafeItem(FOOD_BANK.dinner, allergies) },
  ];

  const totals = meals.reduce(
    (acc, m) => ({ cals: acc.cals + m.cals, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fats: acc.fats + m.fats }),
    { cals: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    goal,
    dailyCalories: targetCalories,
    actualPlanCalories: totals.cals,
    macros: { proteinG: totals.protein, carbsG: totals.carbs, fatsG: totals.fats },
    allergyAware: allergies,
    meals,
    note: 'Generated by rule-based engine (no AI key configured). Set OPENAI_API_KEY for LLM-personalized plans.',
  };
}

async function generateDietPlan(profile, extraInstructions = '') {
  if (!HAS_OPENAI()) return ruleBasedDietPlan(profile);

  try {
    const prompt = `You are a certified nutrition coach. Create a 1-day personalized diet plan as STRICT JSON only (no markdown) with this exact shape:
{"goal":string,"dailyCalories":number,"macros":{"proteinG":number,"carbsG":number,"fatsG":number},"meals":[{"slot":string,"name":string,"cals":number,"protein":number,"carbs":number,"fats":number}],"note":string}
User profile: ${JSON.stringify(profile)}. Respect allergies strictly. Keep note under 20 words.${extraInstructions ? ` Additional admin instructions: ${extraInstructions}` : ''}`;
    const raw = await callOpenAI([{ role: 'user', content: prompt }], { endpoint: 'diet_plan' });
    const jsonStart = raw.indexOf('{');
    const parsed = JSON.parse(raw.slice(jsonStart));
    parsed.allergyAware = profile.allergies || [];
    return parsed;
  } catch (err) {
    console.error('[aiService] OpenAI diet plan failed, using fallback:', err.message);
    return ruleBasedDietPlan(profile);
  }
}

const EXERCISE_BANK = {
  home: {
    Push: ['Push-ups', 'Incline push-ups', 'Tricep dips (chair)', 'Shoulder taps plank'],
    Pull: ['Doorframe rows', 'Superman holds', 'Towel bicep curls'],
    Legs: ['Bodyweight squats', 'Lunges', 'Glute bridges', 'Calf raises'],
    Core: ['Plank', 'Mountain climbers', 'Bicycle crunches', 'Leg raises'],
    Cardio: ['Jumping jacks', 'High knees', 'Burpees', 'Jump rope'],
  },
  gym: {
    Push: ['Bench press', 'Overhead press', 'Dips', 'Tricep pushdown'],
    Pull: ['Lat pulldown', 'Barbell row', 'Face pulls', 'Bicep curls'],
    Legs: ['Barbell squat', 'Leg press', 'Romanian deadlift', 'Leg curl'],
    Core: ['Cable crunch', 'Hanging leg raise', 'Plank', 'Russian twists'],
    Cardio: ['Treadmill intervals', 'Rowing machine', 'Stair climber'],
  },
};

function ruleBasedWorkoutPlan(profile) {
  const { goal = 'maintenance', environment = 'home' } = profile;
  const bank = EXERCISE_BANK[environment] || EXERCISE_BANK.home;

  const focusByGoal = {
    weight_loss: ['Cardio', 'Legs', 'Core', 'Push', 'Cardio', 'Pull', 'Rest'],
    weight_gain: ['Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull', 'Legs'],
    muscle_gain: ['Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull', 'Legs'],
    maintenance: ['Push', 'Cardio', 'Legs', 'Pull', 'Core', 'Cardio', 'Rest'],
  };
  const days = focusByGoal[goal] || focusByGoal.maintenance;
  const repsScheme = goal === 'muscle_gain' ? '4x8-10' : goal === 'weight_gain' ? '4x6-8' : '3x12-15';

  const split = days.map((focus, idx) => {
    if (focus === 'Rest') return { day: `Day ${idx + 1}`, focus: 'Rest', exercises: [] };
    const exercises = (bank[focus] || []).slice(0, 4).map((name) => ({ name, sets: repsScheme.split('x')[0], reps: repsScheme.split('x')[1] }));
    return { day: `Day ${idx + 1}`, focus, exercises };
  });

  return {
    goal,
    environment,
    weeklySplit: split,
    note: 'Generated by rule-based engine (no AI key configured). Set OPENAI_API_KEY for LLM-personalized plans.',
  };
}

async function generateWorkoutPlan(profile, extraInstructions = '') {
  if (!HAS_OPENAI()) return ruleBasedWorkoutPlan(profile);

  try {
    const prompt = `You are a certified strength coach. Create a 7-day workout split as STRICT JSON only (no markdown):
{"goal":string,"environment":string,"weeklySplit":[{"day":string,"focus":string,"exercises":[{"name":string,"sets":string,"reps":string}]}],"note":string}
User profile: ${JSON.stringify(profile)}. Include rest days appropriately. Keep note under 20 words.${extraInstructions ? ` Additional admin instructions: ${extraInstructions}` : ''}`;
    const raw = await callOpenAI([{ role: 'user', content: prompt }], { endpoint: 'workout_plan' });
    const jsonStart = raw.indexOf('{');
    return JSON.parse(raw.slice(jsonStart));
  } catch (err) {
    console.error('[aiService] OpenAI workout plan failed, using fallback:', err.message);
    return ruleBasedWorkoutPlan(profile);
  }
}

const HARMFUL_KEYWORDS = ['kill myself', 'suicide', 'self harm', 'hurt myself', 'overdose'];
const ABUSIVE_KEYWORDS = ['fuck you', 'idiot bot', 'stupid bot', 'shut up bot'];

function moderateText(text) {
  const lower = text.toLowerCase();
  if (HARMFUL_KEYWORDS.some((k) => lower.includes(k))) {
    return { flagged: true, reason: 'self_harm_risk' };
  }
  if (ABUSIVE_KEYWORDS.some((k) => lower.includes(k))) {
    return { flagged: true, reason: 'abusive_language' };
  }
  return { flagged: false };
}

function ruleBasedChatReply(message, context) {
  const lower = message.toLowerCase();
  const { plan, habits, goal } = context;

  if (/self harm|suicide|hurt myself/.test(lower)) {
    return "I'm really sorry you're feeling this way. I'm not able to help with that, but please reach out to a mental health professional or a crisis helpline in your area right away.";
  }
  if (/calor/.test(lower) && plan?.diet) {
    return `Your current daily target is ${plan.diet.dailyCalories} kcal, with meals split across ${plan.diet.meals?.length || 4} slots. That's aligned with your ${goal} goal.`;
  }
  if (/workout|exercise|gym/.test(lower) && plan?.workout) {
    const today = plan.workout.weeklySplit?.[0];
    return today ? `Today's focus is "${today.focus}". Suggested exercises: ${today.exercises.map((e) => e.name).join(', ') || 'rest day, recover well!'}` : "I don't have a workout plan for you yet — generate one from the Workout tab.";
  }
  if (/streak|habit/.test(lower)) {
    return `You're currently on a ${habits?.currentStreak || 0}-day streak. Keep logging meals, water, and workouts daily to keep it alive!`;
  }
  if (/water/.test(lower)) {
    return 'Aim for at least 2-3 liters of water a day, more if you train intensely.';
  }
  return "I'm your AI fitness coach — ask me about your diet plan, workouts, streaks, or progress and I'll use your real data to answer.";
}

async function chatReply(message, context, extraInstructions = '') {
  const moderation = moderateText(message);

  if (!HAS_OPENAI()) {
    return { reply: ruleBasedChatReply(message, context), moderation };
  }

  try {
    const system = `You are a supportive AI fitness coach. Use ONLY the following user context to answer. Be concise (under 80 words). Context: ${JSON.stringify(context)}${extraInstructions ? ` Admin instructions: ${extraInstructions}` : ''}`;
    const reply = await callOpenAI(
      [
        { role: 'system', content: system },
        { role: 'user', content: message },
      ],
      { endpoint: 'chatbot' }
    );
    return { reply, moderation };
  } catch (err) {
    console.error('[aiService] OpenAI chat failed, using fallback:', err.message);
    return { reply: ruleBasedChatReply(message, context), moderation };
  }
}

function analyzeProgressInsights({ previousWeightKg, currentWeightKg, goal }) {
  if (!previousWeightKg) return 'Baseline recorded. Check back next week to see your trend.';
  const delta = Number((currentWeightKg - previousWeightKg).toFixed(1));
  const direction = delta === 0 ? 'stayed the same' : delta > 0 ? `gained ${Math.abs(delta)}kg` : `lost ${Math.abs(delta)}kg`;

  const wantsLoss = goal === 'weight_loss';
  const wantsGain = goal === 'weight_gain' || goal === 'muscle_gain';
  const onTrack = (wantsLoss && delta < 0) || (wantsGain && delta > 0) || (!wantsLoss && !wantsGain && Math.abs(delta) < 0.5);

  return `You ${direction} this week. ${onTrack ? "Great job, you're on track with your goal!" : 'Consider reviewing your habit consistency to better align with your goal.'}`;
}

// Simulated MediaPipe-style body analysis from 4 uploaded images.
// A real implementation would run @mediapipe/tasks-vision pose landmarker on the frontend
// or a Python service; here we derive posture/landmarks deterministically for the demo.
function analyzeBodyImages({ heightCm, weightKg }) {
  const bmi = estimateBMI(heightCm, weightKg);
  const postureOptions = ['Neutral spine, balanced shoulders', 'Slight forward head posture detected', 'Mild anterior pelvic tilt detected'];
  return {
    posture: postureOptions[Math.floor(Math.random() * postureOptions.length)],
    landmarksDetected: 33, // MediaPipe Pose returns 33 landmarks
    estimatedBMI: bmi,
    bmiCategory: bmi ? bmiCategory(bmi) : null,
  };
}

module.exports = {
  HAS_OPENAI,
  estimateBMI,
  bmiCategory,
  calorieTarget,
  generateDietPlan,
  generateWorkoutPlan,
  chatReply,
  moderateText,
  analyzeProgressInsights,
  analyzeBodyImages,
};
