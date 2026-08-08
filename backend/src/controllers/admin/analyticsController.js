const User = require('../../models/User');
const Plan = require('../../models/Plan');
const ChatLog = require('../../models/ChatLog');
const { toDateStr } = require('../../utils/streak');

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

// 5.2 Analytics Dashboard
async function getAnalytics(req, res) {
  const [totalUsers, totalAdmins, bannedUsers] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'user', status: 'banned' }),
  ]);

  const dau = await User.countDocuments({ role: 'user', lastLogin: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } });
  const wau = await User.countDocuments({ role: 'user', lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } });

  const [totalPlans, activePlans] = await Promise.all([
    Plan.countDocuments({}),
    Plan.countDocuments({ active: true }),
  ]);
  const planCompletionRate = totalPlans ? Math.round((activePlans / totalPlans) * 100) : 0;

  const chatAgg = await ChatLog.aggregate([
    { $project: { count: { $size: '$messages' } } },
    { $group: { _id: null, totalMessages: { $sum: '$count' }, totalChats: { $sum: 1 } } },
  ]);
  const chatbotUsage = chatAgg[0] || { totalMessages: 0, totalChats: 0 };

  const avgScoreAgg = await User.aggregate([
    { $match: { role: 'user' } },
    { $group: { _id: null, avgFitnessScore: { $avg: '$fitnessScore' } } },
  ]);
  const avgFitnessScore = Math.round(avgScoreAgg[0]?.avgFitnessScore || 0);

  res.json({
    totalUsers,
    totalAdmins,
    bannedUsers,
    dau,
    wau,
    planCompletionRate,
    chatbotUsage,
    avgFitnessScore,
  });
}

module.exports = { getAnalytics };
