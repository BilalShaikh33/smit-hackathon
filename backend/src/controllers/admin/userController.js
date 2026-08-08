const User = require('../../models/User');
const Plan = require('../../models/Plan');
const Progress = require('../../models/Progress');
const { logAdminAction } = require('../../utils/adminLogger');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 5.1 User Management: list / search / filter
async function listUsers(req, res) {
  const { search = '', status, role, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (search) {
    const safeSearch = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;
  if (role) filter.role = role;

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
}

// View user activity: last login, plan usage, progress stats
async function getUserDetail(req, res) {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const [planCount, progressEntries] = await Promise.all([
    Plan.countDocuments({ user: user._id }),
    Progress.find({ user: user._id }).sort({ weekOf: -1 }).limit(10),
  ]);

  res.json({
    user,
    activity: {
      lastLogin: user.lastLogin,
      planUsage: planCount,
      progressStats: progressEntries,
    },
  });
}

async function setUserStatus(req, res) {
  const { status, reason } = req.body;
  if (!['active', 'banned', 'deactivated'].includes(status)) {
    return res.status(400).json({ message: 'status must be active, banned, or deactivated' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { status, banReason: status === 'banned' ? reason : undefined } },
    { new: true }
  ).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  await logAdminAction(req.user._id, `user.${status}`, { targetType: 'User', targetId: user._id, details: reason });
  res.json({ user });
}

module.exports = { listUsers, getUserDetail, setUserStatus };
