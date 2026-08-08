# AI Fitness Coach (with Admin Panel)

Full-stack implementation of the PRD: AI-powered diet/workout plans, body analysis onboarding,
habit tracking, a RAG-lite AI chatbot, weekly progress tracking, and a complete admin panel
(user management, analytics, AI output monitoring, image moderation, plan overrides, chat
moderation, and reports/logs).

## Run it (one command)

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:5000**. That's it — the same server hosts the REST API, Socket.IO,
and the frontend.

Admin login: `admin@fitcoach.ai` / `Admin@123` (auto-seeded on first boot).

## Why the stack looks the way it does

This machine's Windows **Device Guard / WDAC policy blocks execution of unsigned native
binaries**. That ruled out two things the PRD's default stack assumes:

1. **A local/in-memory MongoDB.** `mongod.exe` (including `mongodb-memory-server`'s
   auto-downloaded binary) is blocked outright. Rather than require everyone running this to
   first set up a MongoDB Atlas cluster, `backend/src/db/miniMongoose.js` is a small pure-JS
   engine that mirrors the slice of the Mongoose API this project uses (schemas, find/update/
   aggregate, populate, upsert semantics) and persists to JSON files under `backend/data/`.
   **Set `MONGO_URI` in `backend/.env`** to point at a real MongoDB/Atlas cluster instead — the
   real `mongoose` package takes over automatically (see `backend/src/db/adapter.js`), and no
   model or controller code needs to change either way.
2. **Vite/webpack (esbuild, rolldown, etc. are all native binaries too — confirmed blocked
   identically).** So the frontend is a build-free React app: React, ReactDOM, Babel Standalone,
   axios, and Socket.IO load from their official CDN builds, and Babel transforms JSX live in
   the browser. That runs entirely inside the browser process, which the OS policy doesn't
   touch. See `frontend/index.html` / `frontend/js/*.js`.

If you run this on a machine without that restriction, everything above still works — you can
optionally swap in Vite/a real MongoDB and nothing else changes.

## AI layer

`backend/src/utils/aiService.js` generates diet plans, workout plans, and chat replies. If
`OPENAI_API_KEY` is set in `.env`, it calls OpenAI directly. **If it's not set** (the default),
a deterministic rule-based engine takes over — calorie targets via Mifflin-St Jeor, an
allergy-aware meal bank, a goal-based workout split generator, and keyword-driven chat replies
grounded in the user's real plan/habit data. The app is fully functional either way; this is
why the demo works with zero API keys.

Admins can tune the AI further from **AI Output Monitoring**: the "prompt template" text saved
there is appended to the AI prompt whenever `OPENAI_API_KEY` is set.

## Project layout

```
backend/
  src/
    models/         Mongoose-shaped schemas (User, Plan, Habit, Progress, ChatLog, AdminLog, SystemLog, PromptTemplate)
    db/              adapter.js (real mongoose vs. embedded store) + miniMongoose.js
    routes/          user-facing REST routes
    controllers/
      admin/         all 7 admin panel modules
    utils/aiService.js   diet/workout/chat generation + fallback engine
    sockets/          Socket.IO auth + per-user rooms (live chat + habit sync)
    seed/            auto-seeds the demo admin account on boot
  data/              embedded-DB JSON files (git-ignored, created at runtime)
  uploads/           body/progress photo uploads (git-ignored, created at runtime)
frontend/
  index.html         CDN script tags + Tailwind Play CDN
  js/lib.js           API client, auth context, hash router, shared UI components
  js/userPages.js     onboarding, dashboard, diet/workout plans, habits, chat, progress
  js/adminPages.js    all 7 admin modules
  js/main.js          hash-based router / route guards
```

## Feature checklist (PRD → implementation)

| PRD section | Where |
|---|---|
| 4.1 AI Onboarding (body analysis, BMI) | `POST /api/onboarding/body-analysis`, Onboarding page |
| 4.2 Goal selection | `POST /api/onboarding/goal` |
| 4.3 AI diet plan (allergy-aware) | `POST /api/plans/diet`, Diet Plan page |
| 4.4 Workout plan generator | `POST /api/plans/workout`, Workout Plan page |
| 4.5 Daily habit tracker + streaks | `/api/habits`, Habit Tracker page |
| 4.6 AI chatbot (RAG) | `/api/chat` (context built from the user's own plan/habits) |
| 4.7 Weekly progress + photo comparison | `/api/progress`, Progress page |
| 4.8 Dashboard | `/api/dashboard` |
| 5.1 User management | `/api/admin/users*` |
| 5.2 Analytics dashboard | `/api/admin/analytics` |
| 5.3 AI output monitoring + prompt tuning | `/api/admin/plans*`, `/api/admin/prompt-templates*` |
| 5.4 Image moderation | `/api/admin/images*` |
| 5.5 Plan management (override system) | `/api/admin/plan-templates*`, `/api/admin/plans/assign` |
| 5.6 Chat moderation | `/api/admin/chats*` |
| 5.7 Reports & logs | `/api/admin/logs/*` |
| RBAC (`verifyJWT`, `checkRole`) | `backend/src/middleware/auth.js` |
| Socket.IO (chat + live tracking sync) | `backend/src/sockets/chatSocket.js` |

## Extras added beyond the PRD

- Auto-seeded admin account and zero-config data store — clone and run, no external services.
- Rule-based AI fallback so the whole product works with **no API key and no cost**.
- Admin-editable AI prompt templates (a lightweight version of "adjust prompt templates").
- Fitness score formula (streak + 7-day consistency + BMI proximity to healthy range).
- AI usage logging (endpoint, tokens) surfaced in Reports & Logs.
- Regex-escaped admin search (avoids a regex-injection footgun on the `$regex` user search).
