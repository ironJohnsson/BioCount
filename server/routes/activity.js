import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Listar atividades recentes do laboratório
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT id, user_name as userName, user_role as userRole, action_text as actionText, code, created_at as timestamp FROM activity_logs ORDER BY created_at DESC LIMIT 40');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar nova ação no feed
router.post('/', async (req, res) => {
  const { userName, userRole, actionText, code } = req.body;
  if (!userName || !actionText) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  try {
    await db.execute({
      sql: 'INSERT INTO activity_logs (id, user_name, user_role, action_text, code) VALUES (?, ?, ?, ?, ?)',
      args: [id, userName, userRole, actionText, code || null]
    });
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

