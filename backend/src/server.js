require('dotenv').config();
require('express-async-errors');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const { ensureAdmin } = require('./seed/ensureAdmin');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initChatSocket } = require('./sockets/chatSocket');

const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const planRoutes = require('./routes/planRoutes');
const habitRoutes = require('./routes/habitRoutes');
const chatRoutes = require('./routes/chatRoutes');
const progressRoutes = require('./routes/progressRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });
app.set('io', io);
initChatSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);
app.use(errorHandler);

// Build-free frontend (plain HTML/JS + Babel-in-browser — see frontend/index.html for why).
// Served from the same origin/port as the API, so there's no CORS or proxy to configure.
// no-cache (not no-store) so the browser still revalidates via a cheap conditional GET
// instead of silently serving a stale copy after an edit — the classic "why don't I see
// my changes" trap for plain <script src> with no build/hashing step.
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendDir, { setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
app.get(/.*/, (req, res) => res.sendFile(path.join(frontendDir, 'index.html')));

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => ensureAdmin())
  .then(() => {
    server.listen(PORT, () => console.log(`[server] AI Fitness Coach API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Failed to connect to DB:', err);
    process.exit(1);
  });
