import { Router } from 'express';
import { getDb } from '../db.js';
import { customDrillSchema, validate } from '../validation.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT name FROM custom_drills ORDER BY name').all();
  res.json(rows.map(r => r.name));
});

router.post('/', validate(customDrillSchema), (req, res) => {
  try {
    const { name } = req.body;
    getDb().prepare('INSERT OR IGNORE INTO custom_drills (name) VALUES (?)').run(name);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:name', (req, res) => {
  getDb().prepare('DELETE FROM custom_drills WHERE name = ?').run(req.params.name);
  res.json({ ok: true });
});

export default router;
