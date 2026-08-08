const db = require('../db/adapter');

async function connectDB() {
  if (process.env.MONGO_URI) {
    await db.connect(process.env.MONGO_URI);
    console.log('[db] Connected to external MongoDB');
  } else {
    await db.connect();
    console.log('[db] No MONGO_URI set — using the embedded pure-JS data store (see backend/data/).');
  }
}

async function disconnectDB() {
  await db.disconnect();
}

module.exports = { connectDB, disconnectDB };
