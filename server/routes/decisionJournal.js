import { Router } from 'express';
import { getDb } from '../db.js';
import { decisionJournalSchema, validate } from '../validation.js';

const router = Router();

function rowToEntry(row) {
  return {
    id: row.id,
    date: row.date,
    matchId: row.match_id || '',
    matchLabel: row.match_label || '',
    decisions: JSON.parse(row.decisions || '[]'),
  };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM decision_journal WHERE user_id = ? ORDER BY date DESC').all(req.userId);
  res.json(rows.map(rowToEntry));
});

router.post('/', validate(decisionJournalSchema), (req, res) => {
  try {
    const e = req.body;
    getDb().prepare(`INSERT OR REPLACE INTO decision_journal (id, date, match_id, match_label, decisions, user_id) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(e.id, e.date, e.matchId || null, e.matchLabel || null, JSON.stringify(e.decisions || []), req.userId);
    res.status(201).json(rowToEntry(getDb().prepare('SELECT * FROM decision_journal WHERE id = ? AND user_id = ?').get(e.id, req.userId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', validate(decisionJournalSchema), (req, res) => {
  try {
    const e = req.body;
    getDb().prepare(`UPDATE decision_journal SET date=?, match_id=?, match_label=?, decisions=?, updated_at=datetime('now') WHERE id=? AND user_id=?`)
      .run(e.date, e.matchId || null, e.matchLabel || null, JSON.stringify(e.decisions || []), req.params.id, req.userId);
    const row = getDb().prepare('SELECT * FROM decision_journal WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToEntry(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM decision_journal WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

export default router;
