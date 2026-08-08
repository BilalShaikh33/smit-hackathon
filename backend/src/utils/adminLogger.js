const AdminLog = require('../models/AdminLog');

async function logAdminAction(adminId, action, { targetType, targetId, details } = {}) {
  try {
    await AdminLog.create({ admin: adminId, action, targetType, targetId, details });
  } catch (err) {
    console.error('[adminLogger] failed to write admin log:', err.message);
  }
}

module.exports = { logAdminAction };
