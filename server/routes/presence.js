import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Heartbeat de presença do usuário
router.post('/heartbeat', async (req, res) => {
  const { userId, userName, role, action } = req.body;
  if (!userId || !userName) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const now = Date.now();

  try {
    await db.execute({
      sql: `
        INSERT INTO presence (user_id, user_name, role, current_action, last_seen)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          user_name = excluded.user_name,
          role = excluded.role,
          current_action = excluded.current_action,
          last_seen = excluded.last_seen
      `,
      args: [userId, userName, role, action || 'Ativo', now]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar contas online agora (ativos nos últimos 3 minutos)
router.get('/online', async (req, res) => {
  const threeMinutesAgo = Date.now() - (3 * 60 * 1000);
  try {
    const result = await db.execute({
      sql: 'SELECT user_id as id, user_name as name, role, current_action as action, last_seen as lastSeen FROM presence WHERE last_seen > ? ORDER BY last_seen DESC',
      args: [threeMinutesAgo]
    });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

