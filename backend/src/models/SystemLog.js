const mongoose = require('../db/adapter');

// Generic system log used for: request logs, AI usage (API calls/tokens), and error tracking.
const systemLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['info', 'ai_usage', 'error'], required: true },
    message: { type: String, required: true },
    meta: mongoose.Schema.Types.Mixed, // e.g. { model, tokensUsed, endpoint, statusCode }
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemLog', systemLogSchema);
