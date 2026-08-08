const mongoose = require('../db/adapter');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    flagReason: String,
  },
  { timestamps: true }
);

const chatLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatLog', chatLogSchema);
