import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const row = getDb().prepare('SELECT data FROM personal_records WHERE user_id = ?').get(req.userId);
  res.json(row?.data ? JSON.parse(row.data) : null);
});

router.put('/', (req, res) => {
  const existing = getDb().prepare('SELECT id FROM personal_records WHERE user_id = ?').get(req.userId);
  if (existing) {
    getDb().prepare('UPDATE personal_records SET data = ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(JSON.stringify(req.body), req.userId);
  } else {
    getDb().prepare('INSERT INTO personal_records (user_id, data) VALUES (?, ?)').run(req.userId, JSON.stringify(req.body));
  }
  res.json(req.body);
});

export default router;
