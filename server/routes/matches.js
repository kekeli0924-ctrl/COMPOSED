import { Router } from 'express';
import { getDb } from '../db.js';
import { matchSchema, validate } from '../validation.js';

const router = Router();

function rowToMatch(row) {
  return {
    id: row.id,
    date: row.date,
    opponent: row.opponent,
    result: row.result,
    minutesPlayed: row.minutes_played,
    goals: row.goals,
    assists: row.assists,
    shots: row.shots,
    passesCompleted: row.passes_completed,
    rating: row.rating,
    notes: row.notes || '',
  };
}

function matchToRow(m) {
  return {
    id: m.id,
    date: m.date,
    opponent: m.opponent,
    result: m.result,
    minutes_played: Number(m.minutesPlayed) || 0,
    goals: Number(m.goals) || 0,
    assists: Number(m.assists) || 0,
    shots: Number(m.shots) || 0,
    passes_completed: Number(m.passesCompleted) || 0,
    rating: Number(m.rating) || 6,
    notes: m.notes || '',
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM matches WHERE user_id = ? ORDER BY date DESC').all(req.userId);
  res.json(rows.map(rowToMatch));
});

router.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToMatch(row));
});

router.post('/', validate(matchSchema), (req, res) => {
  try {
    const r = matchToRow(req.body);
    r.user_id = req.userId;
    getDb().prepare(`INSERT OR REPLACE INTO matches (id, date, opponent, result, minutes_played, goals, assists, shots, passes_completed, rating, notes, user_id)
      VALUES (@id, @date, @opponent, @result, @minutes_played, @goals, @assists, @shots, @passes_completed, @rating, @notes, @user_id)`).run(r);
    res.status(201).json(rowToMatch(getDb().prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(r.id, req.userId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', validate(matchSchema), (req, res) => {
  try {
    const r = matchToRow({ ...req.body, id: req.params.id });
    r.user_id = req.userId;
    getDb().prepare(`UPDATE matches SET date=@date, opponent=@opponent, result=@result, minutes_played=@minutes_played, goals=@goals, assists=@assists, shots=@shots, passes_completed=@passes_completed, rating=@rating, notes=@notes, updated_at=datetime('now') WHERE id=@id AND user_id=@user_id`).run(r);
    const row = getDb().prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToMatch(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM matches WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

export default router;
