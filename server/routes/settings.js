import { Router } from 'express';
import { getDb } from '../db.js';
import { settingsSchema, validate } from '../validation.js';
import { emit } from '../events.js';

const router = Router();

// Position is stored as a JSON array in the TEXT column (e.g. '["Winger","Fullback"]').
// Legacy rows have a bare string like "Winger" or the old sentinel "General" — parse
// defensively and always return an array to the client. Legacy "General" is treated
// as unset so the user gets the new multi-select with nothing preselected.
function parsePositions(raw) {
  if (!raw || raw === 'General') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(p => typeof p === 'string' && p && p !== 'General');
    if (typeof parsed === 'string') return [parsed];
    return [];
  } catch {
    // Not JSON — it's a legacy single-position string.
    return [raw];
  }
}

// playerIdentity is stored the same way: JSON array for new rows, legacy rows
// have a bare string. Empty / nullish becomes an empty array. Entries can be
// either preset IDs (e.g. 'scorer') or custom free-text — we don't distinguish
// at the storage layer, the frontend's identity.js knows which ones are presets.
function parsePlayerIdentity(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(s => typeof s === 'string' && s.length > 0);
    if (typeof parsed === 'string') return parsed.length > 0 ? [parsed] : [];
    return [];
  } catch {
    return [raw]; // legacy bare-string value
  }
}

function rowToSettings(row) {
  return {
    distanceUnit: row.distance_unit || 'km',
    weeklyGoal: row.weekly_goal ?? 3,
    ageGroup: row.age_group || '',
    skillLevel: row.skill_level || '',
    playerName: row.player_name || '',
    onboardingComplete: row.onboarding_complete ?? 0,
    gettingStartedComplete: row.getting_started_complete ?? 0,
    position: parsePositions(row.position),
    equipment: JSON.parse(row.equipment || '["ball","wall"]'),
    playerIdentity: parsePlayerIdentity(row.player_identity),
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

// Serialize incoming position (array or legacy string) to a JSON string for storage.
// Returns null to skip the COALESCE update when the field isn't being changed.
function serializePositionForStorage(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const clean = value.filter(p => typeof p === 'string' && p && p !== 'General');
    return JSON.stringify(clean);
  }
  if (typeof value === 'string') {
    if (!value || value === 'General') return JSON.stringify([]);
    return JSON.stringify([value]);
  }
  return null;
}

// Same pattern for playerIdentity — array or legacy string → JSON array string.
function serializePlayerIdentityForStorage(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    const clean = value.filter(s => typeof s === 'string' && s.length > 0);
    return JSON.stringify(clean);
  }
  if (typeof value === 'string') {
    return value.length > 0 ? JSON.stringify([value]) : JSON.stringify([]);
  }
  return null;
}

router.put('/', validate(settingsSchema), (req, res) => {
  try {
    const db = getDb();
    const s = req.body;
    // Ensure a row exists for this user before updating
    let row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
    if (!row) {
      db.prepare(`INSERT INTO settings (user_id) VALUES (?)`).run(req.userId);
    }
    // Capture prior onboarding state so we can emit onboarding_completed on the 0→1
    // transition. Settings PUT fires many times per session; we only want the once-per-user
    // signal. Reading `row` here is pre-update, which is exactly the edge we want.
    const wasOnboarded = row ? row.onboarding_complete === 1 : false;

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
      position: serializePositionForStorage(s.position),
      equipment: s.equipment ? JSON.stringify(s.equipment) : null,
      player_identity: serializePlayerIdentityForStorage(s.playerIdentity),
      user_id: req.userId,
    });
    row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
    // Fire onboarding_completed only on the 0→1 edge. Subsequent settings edits
    // (changing weekly goal, position, etc.) won't re-emit.
    if (!wasOnboarded && row.onboarding_complete === 1) {
      emit('onboarding_completed', {
        userId: req.userId,
        role: req.userRole,
        properties: {
          position: rowToSettings(row).position,
          playerIdentity: rowToSettings(row).playerIdentity,
          skillLevel: row.skill_level || '',
          ageGroup: row.age_group || '',
        },
      });
    }
    res.json(rowToSettings(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
