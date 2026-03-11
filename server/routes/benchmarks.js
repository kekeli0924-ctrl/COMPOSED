import { Router } from 'express';
import { getDb } from '../db.js';
import { benchmarkSchema, validate } from '../validation.js';

const router = Router();

function rowToBenchmark(row) {
  const data = JSON.parse(row.data || '{}');
  return { id: row.id, date: row.date, type: row.type, score: row.score, ...data };
}

function benchmarkToRow(b) {
  const { id, date, type, score, ...rest } = b;
  return { id, date, type, score: Number(score) || 0, data: JSON.stringify(rest) };
}

router.get('/', (req, res) => {
  const rows = getDb().prepare('SELECT * FROM benchmarks ORDER BY date DESC').all();
  res.json(rows.map(rowToBenchmark));
});

router.post('/', validate(benchmarkSchema), (req, res) => {
  try {
    const r = benchmarkToRow(req.body);
    getDb().prepare('INSERT OR REPLACE INTO benchmarks (id, date, type, score, data) VALUES (@id, @date, @type, @score, @data)').run(r);
    res.status(201).json(rowToBenchmark(getDb().prepare('SELECT * FROM benchmarks WHERE id = ?').get(r.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
