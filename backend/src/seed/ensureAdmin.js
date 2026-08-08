const User = require('../models/User');

// Idempotent: called on every server boot so the demo admin always exists,
// even when running against a fresh in-memory MongoDB instance.
async function ensureAdmin() {
  const email = (process.env.ADMIN_SEED_EMAIL || 'admin@fitcoach.ai').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const admin = await User.create({
    name: process.env.ADMIN_SEED_NAME || 'Super Admin',
    email,
    password: process.env.ADMIN_SEED_PASSWORD || 'Admin@123',
    role: 'admin',
  });
  console.log(`[seed] Created admin user: ${email} / ${process.env.ADMIN_SEED_PASSWORD || 'Admin@123'}`);
  return admin;
}

module.exports = { ensureAdmin };
