// Set DB_PATH before any imports so db.js uses in-memory DB
process.env.DB_PATH = ':memory:';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { getDb, resetDb } from '../db.js';

// Import routes
import sessionsRouter from '../routes/sessions.js';
import matchesRouter from '../routes/matches.js';
import customDrillsRouter from '../routes/customDrills.js';
import settingsRouter from '../routes/settings.js';
import personalRecordsRouter from '../routes/personalRecords.js';
import trainingPlansRouter from '../routes/trainingPlans.js';
import idpGoalsRouter from '../routes/idpGoals.js';
import decisionJournalRouter from '../routes/decisionJournal.js';
import benchmarksRouter from '../routes/benchmarks.js';
import templatesRouter from '../routes/templates.js';
import dataRouter from '../routes/data.js';

let app;

beforeAll(() => {
  // Force a fresh in-memory DB
  resetDb();
  getDb();

  app = express();
  app.use(express.json());
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
});

afterAll(() => {
  resetDb();
});

// ─── Sessions ─────────────────────────────────────────────
describe('Sessions API', () => {
  const session = {
    id: 'test-session-1',
    date: '2026-03-10',
    duration: 60,
    drills: ['Finishing Drill'],
    notes: 'Good session',
    intention: '',
    sessionType: 'solo',
    position: 'general',
    quickRating: 5,
  };

  it('GET /api/sessions returns empty array initially', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/sessions creates a session', async () => {
    const res = await request(app).post('/api/sessions').send(session);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('test-session-1');
    expect(res.body.duration).toBe(60);
    expect(res.body.drills).toEqual(['Finishing Drill']);
  });

  it('GET /api/sessions returns created session', async () => {
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('test-session-1');
  });

  it('GET /api/sessions/:id returns specific session', async () => {
    const res = await request(app).get('/api/sessions/test-session-1');
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Good session');
  });

  it('PUT /api/sessions/:id updates session', async () => {
    const res = await request(app).put('/api/sessions/test-session-1').send({ ...session, duration: 90 });
    expect(res.status).toBe(200);
    expect(res.body.duration).toBe(90);
  });

  it('DELETE /api/sessions/:id deletes session', async () => {
    const res = await request(app).delete('/api/sessions/test-session-1');
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/sessions');
    expect(list.body).toHaveLength(0);
  });

  it('POST /api/sessions rejects invalid data', async () => {
    const res = await request(app).post('/api/sessions').send({ id: 'x', date: 'bad-date' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('POST /api/sessions rejects missing required fields', async () => {
    const res = await request(app).post('/api/sessions').send({});
    expect(res.status).toBe(400);
  });
});

// ─── Matches ─────────────────────────────────────────────
describe('Matches API', () => {
  const match = {
    id: 'test-match-1',
    date: '2026-03-10',
    opponent: 'Arsenal',
    result: 'W',
    minutesPlayed: 90,
    goals: 2,
    assists: 1,
    shots: 5,
    passesCompleted: 40,
    rating: 8,
    notes: 'Great game',
  };

  it('POST /api/matches creates a match', async () => {
    const res = await request(app).post('/api/matches').send(match);
    expect(res.status).toBe(201);
    expect(res.body.opponent).toBe('Arsenal');
  });

  it('POST /api/matches rejects invalid result', async () => {
    const res = await request(app).post('/api/matches').send({ ...match, id: 'x2', result: 'X' });
    expect(res.status).toBe(400);
  });

  it('GET /api/matches returns matches', async () => {
    const res = await request(app).get('/api/matches');
    expect(res.body).toHaveLength(1);
  });

  it('DELETE /api/matches/:id', async () => {
    await request(app).delete('/api/matches/test-match-1');
    const res = await request(app).get('/api/matches');
    expect(res.body).toHaveLength(0);
  });
});

// ─── Custom Drills ────────────────────────────────────────
describe('Custom Drills API', () => {
  it('POST creates a drill', async () => {
    const res = await request(app).post('/api/custom-drills').send({ name: 'My Drill' });
    expect(res.status).toBe(201);
  });

  it('GET returns drills', async () => {
    const res = await request(app).get('/api/custom-drills');
    expect(res.body).toContain('My Drill');
  });

  it('POST rejects empty name', async () => {
    const res = await request(app).post('/api/custom-drills').send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('DELETE removes drill', async () => {
    await request(app).delete('/api/custom-drills/My%20Drill');
    const res = await request(app).get('/api/custom-drills');
    expect(res.body).toHaveLength(0);
  });
});

// ─── Settings ─────────────────────────────────────────────
describe('Settings API', () => {
  it('GET returns defaults', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.distanceUnit).toBe('km');
    expect(res.body.weeklyGoal).toBe(3);
  });

  it('PUT updates settings', async () => {
    const res = await request(app).put('/api/settings').send({ distanceUnit: 'mi', weeklyGoal: 5 });
    expect(res.status).toBe(200);
    expect(res.body.distanceUnit).toBe('mi');
    expect(res.body.weeklyGoal).toBe(5);
  });

  it('PUT rejects invalid unit', async () => {
    const res = await request(app).put('/api/settings').send({ distanceUnit: 'meters' });
    expect(res.status).toBe(400);
  });
});

// ─── Personal Records ─────────────────────────────────────
describe('Personal Records API', () => {
  it('GET returns null initially', async () => {
    const res = await request(app).get('/api/personal-records');
    expect(res.body).toBeNull();
  });

  it('PUT stores records', async () => {
    const records = { bestShot: 80, longestStreak: 5 };
    const res = await request(app).put('/api/personal-records').send(records);
    expect(res.status).toBe(200);
  });

  it('GET returns stored records', async () => {
    const res = await request(app).get('/api/personal-records');
    expect(res.body.bestShot).toBe(80);
  });
});

// ─── Training Plans ───────────────────────────────────────
describe('Training Plans API', () => {
  it('POST creates plan', async () => {
    const res = await request(app).post('/api/training-plans').send({
      id: 'plan-1', date: '2026-03-11', drills: ['Rondo'], targetDuration: 45, notes: '',
    });
    expect(res.status).toBe(201);
  });

  it('GET returns plans', async () => {
    const res = await request(app).get('/api/training-plans');
    expect(res.body).toHaveLength(1);
  });
});

// ─── IDP Goals ────────────────────────────────────────────
describe('IDP Goals API', () => {
  it('POST creates goal', async () => {
    const res = await request(app).post('/api/idp-goals').send({
      id: 'goal-1', corner: 'technical', text: 'Improve weak foot', targetDate: '', progress: 0, status: 'active',
    });
    expect(res.status).toBe(201);
    expect(res.body.corner).toBe('technical');
  });

  it('POST rejects invalid corner', async () => {
    const res = await request(app).post('/api/idp-goals').send({
      id: 'goal-x', corner: 'invalid', text: 'Test',
    });
    expect(res.status).toBe(400);
  });
});

// ─── Decision Journal ─────────────────────────────────────
describe('Decision Journal API', () => {
  it('POST creates entry', async () => {
    const res = await request(app).post('/api/decision-journal').send({
      id: 'dj-1', date: '2026-03-10', matchId: '', matchLabel: '', decisions: [{ situation: 'test', decision: 'pass' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.decisions).toHaveLength(1);
  });
});

// ─── Benchmarks ───────────────────────────────────────────
describe('Benchmarks API', () => {
  it('POST creates benchmark', async () => {
    const res = await request(app).post('/api/benchmarks').send({
      id: 'bm-1', date: '2026-03-10', type: 'lspt', score: 42.5, passes: 10,
    });
    expect(res.status).toBe(201);
    expect(res.body.score).toBe(42.5);
  });

  it('POST rejects invalid type', async () => {
    const res = await request(app).post('/api/benchmarks').send({
      id: 'bm-x', date: '2026-03-10', type: 'invalid', score: 10,
    });
    expect(res.status).toBe(400);
  });
});

// ─── Templates ────────────────────────────────────────────
describe('Templates API', () => {
  it('POST creates template', async () => {
    const res = await request(app).post('/api/templates').send({
      id: 'tpl-1', name: 'Morning Routine', drills: ['Sprint Intervals'],
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Morning Routine');
  });

  it('POST rejects missing name', async () => {
    const res = await request(app).post('/api/templates').send({ id: 'tpl-x' });
    expect(res.status).toBe(400);
  });
});

// ─── Data Export/Import/Clear ─────────────────────────────
describe('Data API', () => {
  it('GET /api/data/export returns all data', async () => {
    const res = await request(app).get('/api/data/export');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
    expect(res.body).toHaveProperty('matches');
    expect(res.body).toHaveProperty('settings');
  });

  it('POST /api/data/clear clears all data', async () => {
    const res = await request(app).post('/api/data/clear');
    expect(res.status).toBe(200);
    const sessions = await request(app).get('/api/sessions');
    expect(sessions.body).toHaveLength(0);
  });

  it('POST /api/data/import imports data', async () => {
    const data = {
      sessions: [{ id: 'imp-1', date: '2026-01-01', duration: 30, drills: ['Test'], quickRating: 3 }],
    };
    const res = await request(app).post('/api/data/import').send(data);
    expect(res.status).toBe(200);
    const sessions = await request(app).get('/api/sessions');
    expect(sessions.body).toHaveLength(1);
  });
});
