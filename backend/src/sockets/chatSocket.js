const jwt = require('jsonwebtoken');

// Real-time layer: clients join a private room keyed by their user id so the
// backend can push chat replies and live habit-tracker updates to all of a
// user's open tabs/devices instantly (Socket.IO, per PRD section 7).
function initChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    if (socket.userRole === 'admin') socket.join('admins');

    socket.on('disconnect', () => {});
  });
}

module.exports = { initChatSocket };
