const Plan = require('../models/Plan');
const PromptTemplate = require('../models/PromptTemplate');
const { generateDietPlan, generateWorkoutPlan } = require('../utils/aiService');

async function createDietPlan(req, res) {
  const profile = req.user.profile;
  if (!profile?.goal) return res.status(400).json({ message: 'Select a goal before generating a plan' });

  const template = await PromptTemplate.findOne({ key: 'diet' });
  await Plan.updateMany({ user: req.user._id, type: 'diet', active: true }, { $set: { active: false } });
  const content = await generateDietPlan(profile, template?.instructions);
  const plan = await Plan.create({ user: req.user._id, type: 'diet', goal: profile.goal, content, source: 'ai' });
  res.status(201).json({ plan });
}

async function createWorkoutPlan(req, res) {
  const profile = req.user.profile;
  if (!profile?.goal) return res.status(400).json({ message: 'Select a goal before generating a plan' });

  const template = await PromptTemplate.findOne({ key: 'workout' });
  await Plan.updateMany({ user: req.user._id, type: 'workout', active: true }, { $set: { active: false } });
  const content = await generateWorkoutPlan(profile, template?.instructions);
  const plan = await Plan.create({ user: req.user._id, type: 'workout', goal: profile.goal, content, source: 'ai' });
  res.status(201).json({ plan });
}

async function getMyPlans(req, res) {
  const [diet, workout] = await Promise.all([
    Plan.findOne({ user: req.user._id, type: 'diet', active: true }).sort({ createdAt: -1 }),
    Plan.findOne({ user: req.user._id, type: 'workout', active: true }).sort({ createdAt: -1 }),
  ]);
  res.json({ diet, workout });
}

module.exports = { createDietPlan, createWorkoutPlan, getMyPlans };
