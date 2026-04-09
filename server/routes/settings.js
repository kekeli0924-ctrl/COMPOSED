import { Router } from 'express';
import { getDb } from '../db.js';
import { settingsSchema, validate } from '../validation.js';

const router = Router();

function rowToSettings(row) {
  return {
    distanceUnit: row.distance_unit || 'km',
    weeklyGoal: row.weekly_goal ?? 3,
    ageGroup: row.age_group || '',
    skillLevel: row.skill_level || '',
    playerName: row.player_name || '',
    onboardingComplete: row.onboarding_complete ?? 0,
    gettingStartedComplete: row.getting_started_complete ?? 0,
    position: row.position || 'General',
    equipment: JSON.parse(row.equipment || '["ball","wall"]'),
    playerIdentity: row.player_identity || '',
  };
}

router.get('/', (req, res) => {
  const db = getDb();
  let row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
  if (!row) {
    db.prepare(`INSERT INTO settings (user_id) VALUES (?)`).run(req.userId);
    row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
  }
  res.json(rowToSettings(row));
});

router.put('/', validate(settingsSchema), (req, res) => {
  try {
    const db = getDb();
    const s = req.body;
    // Ensure a row exists for this user before updating
    let row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
    if (!row) {
      db.prepare(`INSERT INTO settings (user_id) VALUES (?)`).run(req.userId);
    }
    db.prepare(`UPDATE settings SET
      distance_unit = COALESCE(@distance_unit, distance_unit),
      weekly_goal = COALESCE(@weekly_goal, weekly_goal),
      age_group = COALESCE(@age_group, age_group),
      skill_level = COALESCE(@skill_level, skill_level),
      player_name = COALESCE(@player_name, player_name),
      onboarding_complete = COALESCE(@onboarding_complete, onboarding_complete),
      getting_started_complete = COALESCE(@getting_started_complete, getting_started_complete),
      position = COALESCE(@position, position),
      equipment = COALESCE(@equipment, equipment),
      player_identity = COALESCE(@player_identity, player_identity),
      updated_at = datetime('now')
      WHERE user_id = @user_id`).run({
      distance_unit: s.distanceUnit ?? null,
      weekly_goal: s.weeklyGoal ?? null,
      age_group: s.ageGroup ?? null,
      skill_level: s.skillLevel ?? null,
      player_name: s.playerName ?? null,
      onboarding_complete: s.onboardingComplete ?? null,
      getting_started_complete: s.gettingStartedComplete ?? null,
      position: s.position ?? null,
      equipment: s.equipment ? JSON.stringify(s.equipment) : null,
      player_identity: s.playerIdentity ?? null,
      user_id: req.userId,
    });
    row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
    res.json(rowToSettings(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
