const Plan = require('../../models/Plan');
const { logAdminAction } = require('../../utils/adminLogger');

// 5.5 Plan Management (Override System)

async function editPlan(req, res) {
  const { content, goal } = req.body;
  const plan = await Plan.findByIdAndUpdate(
    req.params.id,
    { $set: { content, goal, source: 'admin_edited', editedBy: req.user._id } },
    { new: true }
  );
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  await logAdminAction(req.user._id, 'plan.edit', { targetType: 'Plan', targetId: plan._id });
  res.json({ plan });
}

async function createTemplate(req, res) {
  const { type, templateName, content, goal } = req.body;
  if (!['diet', 'workout'].includes(type)) return res.status(400).json({ message: 'type must be diet or workout' });

  const template = await Plan.create({
    user: req.user._id, // owned by the admin who created it; assignPlan clones it for real users
    type,
    goal,
    content,
    source: 'admin_manual',
    isTemplate: true,
    templateName,
    active: false,
  });

  await logAdminAction(req.user._id, 'plan.create_template', { targetType: 'Plan', targetId: template._id, details: templateName });
  res.status(201).json({ template });
}

async function listTemplates(req, res) {
  const templates = await Plan.find({ isTemplate: true }).sort({ createdAt: -1 });
  res.json({ templates });
}

// Assign a manual/template plan to a specific user.
async function assignPlan(req, res) {
  const { userId, templateId, type, content, goal } = req.body;

  let planType = type;
  let planContent = content;
  let planGoal = goal;

  if (templateId) {
    const template = await Plan.findById(templateId);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    planType = template.type;
    planContent = template.content;
    planGoal = template.goal;
  }

  if (!planType || !planContent) return res.status(400).json({ message: 'type + content (or templateId) required' });

  await Plan.updateMany({ user: userId, type: planType, active: true }, { $set: { active: false } });
  const plan = await Plan.create({
    user: userId,
    type: planType,
    goal: planGoal,
    content: planContent,
    source: 'admin_manual',
    editedBy: req.user._id,
  });

  await logAdminAction(req.user._id, 'plan.assign', { targetType: 'User', targetId: userId, details: `${planType} plan assigned` });
  res.status(201).json({ plan });
}

module.exports = { editPlan, createTemplate, listTemplates, assignPlan };
