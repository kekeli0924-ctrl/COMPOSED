import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { authMiddleware, authRouter } from './auth.js';
import { backupDatabase } from './backup.js';
import sessionsRouter from './routes/sessions.js';
import matchesRouter from './routes/matches.js';
import customDrillsRouter from './routes/customDrills.js';
import settingsRouter from './routes/settings.js';
import personalRecordsRouter from './routes/personalRecords.js';
import trainingPlansRouter from './routes/trainingPlans.js';
import idpGoalsRouter from './routes/idpGoals.js';
import decisionJournalRouter from './routes/decisionJournal.js';
import benchmarksRouter from './routes/benchmarks.js';
import templatesRouter from './routes/templates.js';
import dataRouter from './routes/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Compression
app.use(compression());

// CORS — restricted to configured origin
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: isProd ? corsOrigin : true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no auth required)
app.use('/api/auth', authRouter);

// Protected API routes — auth required in production
if (isProd) {
  app.use('/api', authMiddleware);
}

// API routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/custom-drills', customDrillsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/personal-records', personalRecordsRouter);
app.use('/api/training-plans', trainingPlansRouter);
app.use('/api/idp-goals', idpGoalsRouter);
app.use('/api/decision-journal', decisionJournalRouter);
app.use('/api/benchmarks', benchmarksRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/data', dataRouter);

// Error handler for API routes
app.use('/api', (err, req, res, next) => {
  console.error(`API Error [${req.method} ${req.originalUrl}]:`, err.message);
  res.status(500).json({ error: isProd ? 'Internal server error' : err.message });
});

// Production: serve Vite build
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath, { maxAge: '1d' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Daily backup (runs at startup and every 24h)
backupDatabase();
setInterval(backupDatabase, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`NXTPLY API server running on http://localhost:${PORT} (${isProd ? 'production' : 'development'})`);
});
