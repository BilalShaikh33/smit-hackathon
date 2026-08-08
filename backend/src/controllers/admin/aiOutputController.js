const Plan = require('../../models/Plan');
const PromptTemplate = require('../../models/PromptTemplate');
const { logAdminAction } = require('../../utils/adminLogger');

// 5.3 AI Output Monitoring: view generated plans, flag inaccurate/inappropriate ones.
async function listGeneratedPlans(req, res) {
  const { type, flagged, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (flagged !== undefined) filter.flagged = flagged === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [plans, total] = await Promise.all([
    Plan.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Plan.countDocuments(filter),
  ]);
  res.json({ plans, total, page: Number(page), pages: Math.ceil(total / limit) });
}

async function flagPlan(req, res) {
  const { flagged, flagReason } = req.body;
  const plan = await Plan.findByIdAndUpdate(req.params.id, { $set: { flagged: Boolean(flagged), flagReason } }, { new: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  await logAdminAction(req.user._id, flagged ? 'plan.flag' : 'plan.unflag', {
    targetType: 'Plan',
    targetId: plan._id,
    details: flagReason,
  });
  res.json({ plan });
}

// admin-controlled AI tuning
async function listPromptTemplates(req, res) {
  const templates = await PromptTemplate.find({});
  res.json({ templates });
}

async function upsertPromptTemplate(req, res) {
  const { key } = req.params;
  const { instructions } = req.body;
  if (!['diet', 'workout', 'chat'].includes(key)) return res.status(400).json({ message: 'Invalid template key' });

  const template = await PromptTemplate.findOneAndUpdate(
    { key },
    { $set: { instructions, updatedBy: req.user._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await logAdminAction(req.user._id, 'prompt_template.update', { targetType: 'PromptTemplate', targetId: template._id, details: key });
  res.json({ template });
}

module.exports = { listGeneratedPlans, flagPlan, listPromptTemplates, upsertPromptTemplate };
