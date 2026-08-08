require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const { ensureAdmin } = require('./ensureAdmin');

// Standalone script — mainly useful when MONGO_URI points at a real/persistent
// database. The server also auto-runs ensureAdmin() on every boot, which is
// what makes the zero-config in-memory-MongoDB demo path work.
async function seed() {
  await connectDB();
  await ensureAdmin();
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
