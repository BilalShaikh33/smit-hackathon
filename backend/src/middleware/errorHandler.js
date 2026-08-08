const SystemLog = require('../models/SystemLog');

function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

async function errorHandler(err, req, res, next) {
  console.error(err);
  try {
    await SystemLog.create({
      type: 'error',
      message: err.message || 'Unknown error',
      meta: { path: req.originalUrl, method: req.method, stack: err.stack },
      user: req.user ? req.user._id : undefined,
    });
  } catch (_) {
    // logging must never crash the app
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
