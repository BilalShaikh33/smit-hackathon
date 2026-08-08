const SystemLog = require('../../models/SystemLog');
const AdminLog = require('../../models/AdminLog');

// 5.7 Reports & Logs: system logs, AI usage logs (API calls/tokens), error tracking.
async function listSystemLogs(req, res) {
  const { type, page = 1, limit = 50 } = req.query;
  const filter = type ? { type } : {};
  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    SystemLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    SystemLog.countDocuments(filter),
  ]);
  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
}

async function listAdminLogs(req, res) {
  const logs = await AdminLog.find({}).populate('admin', 'name email').sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
}

async function aiUsageSummary(req, res) {
  const agg = await SystemLog.aggregate([
    { $match: { type: 'ai_usage' } },
    {
      $group: {
        _id: '$meta.endpoint',
        calls: { $sum: 1 },
        totalTokens: { $sum: '$meta.tokensUsed' },
      },
    },
  ]);
  res.json({ summary: agg });
}

module.exports = { listSystemLogs, listAdminLogs, aiUsageSummary };
