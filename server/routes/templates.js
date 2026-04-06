import { Router } from 'express';
import { getDb } from '../db.js';
import { templateSchema, validate } from '../validation.js';

const router = Router();

function rowToTemplate(row) {
  const data = JSON.parse(row.data || '{}');
  return { id: row.id, name: row.name, ...data };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(rows.map(rowToTemplate));
});

router.post('/', validate(templateSchema), (req, res) => {
  try {
    const { id, name, ...rest } = req.body;
    getDb().prepare('INSERT OR REPLACE INTO templates (id, name, data, user_id) VALUES (?, ?, ?, ?)').run(id, name, JSON.stringify(rest), req.userId);
    res.status(201).json(rowToTemplate(getDb().prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, req.userId)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ ok: true });
});

export default router;
