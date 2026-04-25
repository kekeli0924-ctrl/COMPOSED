/**
 * Seed script: creates a coach account with 5 test players and realistic sessions.
 * Run: node server/seed-coach-demo.js
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from './db.js';

const db = getDb();

const hash = bcrypt.hashSync('test123', 12);

// ── Create coach account ────────────────
const existingCoach = db.prepare('SELECT id FROM users WHERE username = ?').get('coachdemo');
let coachId;
if (existingCoach) {
  coachId = existingCoach.id;
  console.log(`Coach 'coachdemo' already exists (id=${coachId})`);
} else {
  const r = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'coach')").run('coachdemo', hash);
  coachId = r.lastInsertRowid;
  console.log(`Created coach 'coachdemo' (id=${coachId})`);
}

// ── Create 5 players ────────────────
const players = [
  { username: 'marcus_fw', name: 'Marcus Johnson', position: 'Forward',     style: 'high' },
  { username: 'aisha_mf', name: 'Aisha Patel',    position: 'Midfielder',  style: 'consistent' },
  { username: 'carlos_df', name: 'Carlos Rivera',  position: 'Defender',    style: 'stalling' },
  { username: 'emma_gk',  name: 'Emma Chen',       position: 'Goalkeeper',  style: 'overtraining' },
  { username: 'liam_fw',  name: 'Liam O\'Brien',   position: 'Forward',     style: 'inactive' },
];

const playerIds = [];

for (const p of players) {
  let existing = db.prepare('SELECT id FROM users WHERE username = ?').get(p.username);
  let pid;
  if (existing) {
    pid = existing.id;
    console.log(`Player '${p.username}' already exists (id=${pid})`);
  } else {
    const r = db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'player')").run(p.username, hash);
    pid = r.lastInsertRowid;
    console.log(`Created player '${p.username}' (id=${pid})`);
  }
  playerIds.push({ ...p, id: pid });

  // Ensure settings row exists
  const settingsExist = db.prepare('SELECT id FROM settings WHERE user_id = ?').get(pid);
  if (!settingsExist) {
    db.prepare("INSERT INTO settings (user_id, player_name, position, age_group, skill_level, onboarding_complete) VALUES (?, ?, ?, 'U16', 'intermediate', 1)")
      .run(pid, p.name, p.position);
  } else {
    db.prepare('UPDATE settings SET player_name = ?, position = ? WHERE user_id = ?').run(p.name, p.position, pid);
  }

  // Link to coach
  try {
    db.prepare('INSERT OR IGNORE INTO coach_players (coach_id, player_id) VALUES (?, ?)').run(coachId, pid);
  } catch { /* already linked */ }
}

// ── Log sessions for each player ────────────────

const now = new Date();

function dateStr(daysAgo) {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeSession(userId, daysAgo, opts) {
  const id = crypto.randomUUID();
  const date = dateStr(daysAgo);
  const duration = opts.duration || randInt(25, 60);
  const quickRating = opts.rpe || randInt(4, 8);
  const shooting = JSON.stringify({
    leftFoot: { made: opts.shotsMade || randInt(2, 8), attempted: opts.shotsAttempted || randInt(8, 15) },
    rightFoot: { made: opts.shotsMade || randInt(3, 10), attempted: opts.shotsAttempted || randInt(10, 18) },
  });
  const passing = JSON.stringify({
    completed: opts.passesMade || randInt(15, 40),
    attempted: opts.passesAttempted || randInt(30, 50),
  });
  const drills = JSON.stringify(opts.drills || ['Warm-up', 'Main drill', 'Cool-down']);

  db.prepare(`INSERT OR IGNORE INTO sessions (id, user_id, date, duration, quick_rating, shooting, passing, drills, notes, session_type, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'training', ?)`).run(
    id, userId, date, duration, quickRating, shooting, passing, drills,
    opts.notes || '', opts.position || 'General'
  );
}

// Clear old test sessions
for (const p of playerIds) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(p.id);
}
console.log('\nCleared old test sessions');

// ── Marcus (Forward, high performer — accelerating) ────
const marcus = playerIds[0];
// Last month: decent
for (let d = 28; d >= 22; d -= 2) makeSession(marcus.id, d, { shotsMade: 5, shotsAttempted: 12, passesMade: 20, passesAttempted: 30, rpe: 6, position: 'Forward' });
// Last week: good
for (let d = 13; d >= 8; d -= 2) makeSession(marcus.id, d, { shotsMade: 7, shotsAttempted: 12, passesMade: 25, passesAttempted: 32, rpe: 7, position: 'Forward' });
// This week: great (accelerating)
makeSession(marcus.id, 5, { shotsMade: 9, shotsAttempted: 12, passesMade: 28, passesAttempted: 33, rpe: 7, position: 'Forward' });
makeSession(marcus.id, 3, { shotsMade: 10, shotsAttempted: 13, passesMade: 30, passesAttempted: 35, rpe: 7, position: 'Forward' });
makeSession(marcus.id, 1, { shotsMade: 8, shotsAttempted: 11, passesMade: 27, passesAttempted: 30, rpe: 6, position: 'Forward' });
console.log(`Logged 10 sessions for Marcus (accelerating)`);

// ── Aisha (Midfielder, consistent — steady pace) ────
const aisha = playerIds[1];
for (let d = 28; d >= 1; d -= 3) {
  makeSession(aisha.id, d, { shotsMade: 4, shotsAttempted: 10, passesMade: 30, passesAttempted: 42, rpe: 6, duration: 45, position: 'Midfielder' });
}
console.log(`Logged 10 sessions for Aisha (steady)`);

// ── Carlos (Defender, stalling — accuracy declining) ────
const carlos = playerIds[2];
// Last month: ok
for (let d = 28; d >= 20; d -= 3) makeSession(carlos.id, d, { shotsMade: 5, shotsAttempted: 10, passesMade: 25, passesAttempted: 35, rpe: 5, position: 'Defender' });
// Last week: declining
makeSession(carlos.id, 10, { shotsMade: 3, shotsAttempted: 12, passesMade: 18, passesAttempted: 35, rpe: 5, position: 'Defender' });
makeSession(carlos.id, 8, { shotsMade: 2, shotsAttempted: 11, passesMade: 16, passesAttempted: 34, rpe: 4, position: 'Defender' });
// This week: still declining
makeSession(carlos.id, 4, { shotsMade: 2, shotsAttempted: 13, passesMade: 15, passesAttempted: 38, rpe: 4, position: 'Defender' });
makeSession(carlos.id, 2, { shotsMade: 1, shotsAttempted: 10, passesMade: 14, passesAttempted: 36, rpe: 3, position: 'Defender' });
console.log(`Logged 7 sessions for Carlos (stalling)`);

// ── Emma (Goalkeeper, overtraining — high RPE spike) ────
const emma = playerIds[3];
// Last week: normal
makeSession(emma.id, 12, { shotsMade: 0, shotsAttempted: 0, passesMade: 10, passesAttempted: 15, rpe: 5, duration: 40, position: 'Goalkeeper' });
makeSession(emma.id, 10, { shotsMade: 0, shotsAttempted: 0, passesMade: 12, passesAttempted: 16, rpe: 6, duration: 45, position: 'Goalkeeper' });
makeSession(emma.id, 8, { shotsMade: 0, shotsAttempted: 0, passesMade: 11, passesAttempted: 14, rpe: 6, duration: 50, position: 'Goalkeeper' });
// This week: intensity spiked
makeSession(emma.id, 5, { shotsMade: 0, shotsAttempted: 0, passesMade: 14, passesAttempted: 18, rpe: 9, duration: 70, position: 'Goalkeeper' });
makeSession(emma.id, 3, { shotsMade: 0, shotsAttempted: 0, passesMade: 15, passesAttempted: 19, rpe: 9, duration: 75, position: 'Goalkeeper' });
makeSession(emma.id, 1, { shotsMade: 0, shotsAttempted: 0, passesMade: 13, passesAttempted: 17, rpe: 10, duration: 80, position: 'Goalkeeper' });
console.log(`Logged 6 sessions for Emma (overtraining)`);

// ── Liam (Forward, inactive — trained last week, silent this week) ────
const liam = playerIds[4];
makeSession(liam.id, 12, { shotsMade: 6, shotsAttempted: 12, passesMade: 20, passesAttempted: 30, rpe: 6, position: 'Forward' });
makeSession(liam.id, 10, { shotsMade: 7, shotsAttempted: 14, passesMade: 22, passesAttempted: 32, rpe: 7, position: 'Forward' });
makeSession(liam.id, 8, { shotsMade: 5, shotsAttempted: 11, passesMade: 18, passesAttempted: 28, rpe: 6, position: 'Forward' });
// This week: nothing
console.log(`Logged 3 sessions for Liam (inactive this week)`);

// ── Assign some plans to show compliance ────────────────

// Assign plans for this week to Marcus, Aisha, Carlos
const day = now.getDay();
const mondayOffset = day === 0 ? -6 : 1 - day;
const weekStart = new Date(now);
weekStart.setDate(weekStart.getDate() + mondayOffset);

for (let d = 0; d < 5; d++) {
  const planDate = new Date(weekStart);
  planDate.setDate(planDate.getDate() + d);
  const pDate = planDate.toISOString().slice(0, 10);
  const drills = JSON.stringify([{ name: 'Warm-up', duration: 5 }, { name: 'Main drill', duration: 20 }, { name: 'Cool-down', duration: 5 }]);

  for (const pid of [marcus.id, aisha.id, carlos.id]) {
    try {
      db.prepare('INSERT OR IGNORE INTO assigned_plans (id, coach_id, player_id, date, drills, target_duration) VALUES (?, ?, ?, ?, ?, 30)')
        .run(crypto.randomUUID(), coachId, pid, pDate, drills);
    } catch { /* ignore */ }
  }
}

// Also assign last week's plans for compliance comparison
const prevWeekStart = new Date(weekStart);
prevWeekStart.setDate(prevWeekStart.getDate() - 7);
for (let d = 0; d < 5; d++) {
  const planDate = new Date(prevWeekStart);
  planDate.setDate(planDate.getDate() + d);
  const pDate = planDate.toISOString().slice(0, 10);
  const drills = JSON.stringify([{ name: 'Warm-up', duration: 5 }, { name: 'Main drill', duration: 20 }, { name: 'Cool-down', duration: 5 }]);

  for (const pid of [marcus.id, aisha.id, carlos.id]) {
    try {
      db.prepare('INSERT OR IGNORE INTO assigned_plans (id, coach_id, player_id, date, drills, target_duration) VALUES (?, ?, ?, ?, ?, 30)')
        .run(crypto.randomUUID(), coachId, pid, pDate, drills);
    } catch { /* ignore */ }
  }
}

console.log('Assigned 5-day plans for Marcus, Aisha, Carlos (this week + last week)\n');

// ── Summary ────────────────
console.log('=== SEED COMPLETE ===');
console.log(`Coach login: coachdemo / test123`);
console.log(`Players: ${playerIds.map(p => p.username).join(', ')} (all password: test123)`);
console.log('\nExpected Squad Pulse insights:');
console.log('  🔴 Carlos stalling on shooting accuracy');
console.log('  🔴 Emma RPE spiked from 6 → 10 (overtraining)');
console.log('  🟡 Liam went quiet this week (3 sessions → 0)');
console.log('  🟡 Carlos low RPE (training but not challenged)');
console.log('  🟢 Marcus accelerating');
console.log('  🟢 Aisha steady pace');
