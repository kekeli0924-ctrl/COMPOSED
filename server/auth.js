import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-random-secret';
const TOKEN_EXPIRY = '30d';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length > 50) return res.status(400).json({ error: 'Username too long' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username taken' });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
  const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  res.status(201).json({ token, userId: result.lastInsertRowid });
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db = getDb();
  const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  res.json({ token, userId: user.id });
});

export { authRouter };
