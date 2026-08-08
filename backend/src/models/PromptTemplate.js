const mongoose = require('../db/adapter');

// 5.3 AI Output Monitoring: lets admins tune the instructions appended to AI generation
// prompts (diet / workout / chat) without touching code.
const promptTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ['diet', 'workout', 'chat'], unique: true, required: true },
    instructions: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromptTemplate', promptTemplateSchema);
