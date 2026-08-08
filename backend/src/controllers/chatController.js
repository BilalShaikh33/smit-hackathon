const ChatLog = require('../models/ChatLog');
const Plan = require('../models/Plan');
const Habit = require('../models/Habit');
const PromptTemplate = require('../models/PromptTemplate');
const { chatReply } = require('../utils/aiService');

// Builds the "retrieval" context for the RAG chatbot from the user's own plan + progress data.
async function buildContext(userId) {
  const [diet, workout, recentHabits] = await Promise.all([
    Plan.findOne({ user: userId, type: 'diet', active: true }).sort({ createdAt: -1 }).lean(),
    Plan.findOne({ user: userId, type: 'workout', active: true }).sort({ createdAt: -1 }).lean(),
    Habit.find({ user: userId }).sort({ date: -1 }).limit(7).lean(),
  ]);

  return {
    plan: { diet: diet?.content, workout: workout?.content },
    habits: { recentHabits, currentStreak: recentHabits.filter((h) => h.goalsMet).length },
  };
}

async function sendMessage(req, res) {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'message is required' });

  if (req.user.chatBlocked) {
    return res.status(403).json({ message: 'You have been blocked from using the chatbot by an admin.' });
  }

  const context = await buildContext(req.user._id);
  context.goal = req.user.profile?.goal;

  const template = await PromptTemplate.findOne({ key: 'chat' });
  const { reply, moderation } = await chatReply(message, context, template?.instructions);

  const log = await ChatLog.findOneAndUpdate(
    { user: req.user._id },
    {
      $push: {
        messages: {
          $each: [
            { sender: 'user', text: message, flagged: moderation.flagged, flagReason: moderation.reason, createdAt: new Date() },
            { sender: 'ai', text: reply, createdAt: new Date() },
          ],
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const io = req.app.get('io');
  io?.to(`user:${req.user._id}`).emit('chat:message', { sender: 'ai', text: reply, createdAt: new Date() });

  res.status(201).json({ reply, flagged: moderation.flagged, chatLogId: log._id });
}

async function getHistory(req, res) {
  const log = await ChatLog.findOne({ user: req.user._id });
  res.json({ messages: log?.messages || [] });
}

module.exports = { sendMessage, getHistory, buildContext };
