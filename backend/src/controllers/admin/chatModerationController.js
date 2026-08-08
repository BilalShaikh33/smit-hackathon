const ChatLog = require('../../models/ChatLog');
const User = require('../../models/User');
const { logAdminAction } = require('../../utils/adminLogger');

// 5.6 Chat Moderation
async function listChats(req, res) {
  const { flaggedOnly } = req.query;
  const filter = flaggedOnly === 'true' ? { 'messages.flagged': true } : {};
  const chats = await ChatLog.find(filter).populate('user', 'name email chatBlocked').sort({ updatedAt: -1 }).limit(50);
  res.json({ chats });
}

async function getChatByUser(req, res) {
  const chat = await ChatLog.findOne({ user: req.params.userId }).populate('user', 'name email chatBlocked');
  res.json({ chat });
}

async function setChatBlocked(req, res) {
  const { blocked } = req.body;
  const user = await User.findByIdAndUpdate(req.params.userId, { $set: { chatBlocked: Boolean(blocked) } }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  await logAdminAction(req.user._id, blocked ? 'chat.block_user' : 'chat.unblock_user', { targetType: 'User', targetId: user._id });
  res.json({ user });
}

module.exports = { listChats, getChatByUser, setChatBlocked };
