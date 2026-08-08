const mongoose = require('../db/adapter');

const adminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetType: String,
    targetId: mongoose.Schema.Types.ObjectId,
    details: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminLog', adminLogSchema);
