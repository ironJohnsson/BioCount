import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// Listar todos os espécimes da planilha
router.get('/', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM specimens ORDER BY updated_at DESC');
    const specimens = result.rows.map(row => ({
      id: row.id,
      tombo: row.counting_code,
      countingCode: row.counting_code,
      analystName: row.analyst_name,
      analystRole: row.analyst_role,
      status: row.status,
      count: row.count,
      order: row.order_name,
      family: row.family,
      genus: row.genus,
      species: row.species,
      popularName: row.popular_name,
      collector: row.collector,
      date: row.date_collected,
      location: row.location,
      preservation: row.preservation,
      stage: row.stage,
      sex: row.sex,
      notes: row.notes,
      variables: row.variables_json ? JSON.parse(row.variables_json) : [],
      verifiedBy: row.verified_by,
      verifiedById: row.verified_by_id,
      verifiedAt: row.verified_at,
      verificationNotes: row.verification_notes,
      updatedAt: row.updated_at
    }));
    res.json(specimens);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Checar código de contagem para proteção contra duplicatas na planilha
router.get('/check-code/:code', async (req, res) => {
  const { code } = req.params;
  const normalized = code.trim().toUpperCase();

  try {
    const result = await db.execute({
      sql: 'SELECT id, counting_code, analyst_name, status FROM specimens WHERE UPPER(counting_code) = ?',
      args: [normalized]
    });

    if (result.rows.length > 0) {
      res.json({
        exists: true,
        specimen: {
          id: result.rows[0].id,
          code: result.rows[0].counting_code,
          analystName: result.rows[0].analyst_name,
          status: result.rows[0].status
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Salvar ou Atualizar Espécime (Rascunho, Pendente de Verificação ou Verificado)
router.post('/', async (req, res) => {
  const data = req.body;
  const code = (data.tombo || data.countingCode || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ error: 'Código da contagem é obrigatório' });
  }

  const id = data.id || `sp-${Date.now()}`;
  const status = data.status || 'rascunho';
  const variablesJson = JSON.stringify(data.variables || []);

  try {
    // Verificar se código já existe em outro ID (Proteção contra duplicatas)
    const checkDuplicate = await db.execute({
      sql: 'SELECT id, analyst_name, status FROM specimens WHERE UPPER(counting_code) = ? AND id != ?',
      args: [code, id]
    });

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        error: `Código ${code} já existe na planilha!`,
        duplicate: checkDuplicate.rows[0]
      });
    }

    // Upsert
    await db.execute({
      sql: `
        INSERT INTO specimens (
          id, counting_code, analyst_name, analyst_role, status, count,
          order_name, family, genus, species, popular_name, collector,
          date_collected, location, preservation, stage, sex, notes,
          variables_json, verified_by, verified_by_id, verified_at, verification_notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          counting_code = excluded.counting_code,
          analyst_name = excluded.analyst_name,
          analyst_role = excluded.analyst_role,
          status = excluded.status,
          count = excluded.count,
          order_name = excluded.order_name,
          family = excluded.family,
          genus = excluded.genus,
          species = excluded.species,
          popular_name = excluded.popular_name,
          collector = excluded.collector,
          date_collected = excluded.date_collected,
          location = excluded.location,
          preservation = excluded.preservation,
          stage = excluded.stage,
          sex = excluded.sex,
          notes = excluded.notes,
          variables_json = excluded.variables_json,
          verified_by = excluded.verified_by,
          verified_by_id = excluded.verified_by_id,
          verified_at = excluded.verified_at,
          verification_notes = excluded.verification_notes,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        id,
        code,
        data.analystName || 'Anônimo',
        data.analystRole || 'aluno_treinamento',
        status,
        data.count || 1,
        data.order || '',
        data.family || '',
        data.genus || '',
        data.species || '',
        data.popularName || '',
        data.collector || '',
        data.date || '',
        data.location || '',
        data.preservation || '',
        data.stage || '',
        data.sex || '',
        data.notes || '',
        variablesJson,
        data.verifiedBy || null,
        data.verifiedById || null,
        data.verifiedAt || null,
        data.verificationNotes || null
      ]
    });

    res.status(200).json({ success: true, id, countingCode: code, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auditoria / Verificação de amostra
// "Ao verificar a informação é tirada da planilha e acrescenta informações novas"
router.post('/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { verifierName, verifierRole, verifierId, verificationNotes, decision } = req.body;

  // Só quem tem treinamento finalizado ou professor pode validar
  if (verifierRole === 'aluno_treinamento' || verifierRole === 'trainee') {
    return res.status(403).json({
      error: 'Acesso negado: Apenas alunos com treinamento finalizado ou professores podem validar amostras.'
    });
  }

  const newStatus = decision === 'aprovado' ? 'verificado' : 'pendente_verificacao';
  const verifiedAt = new Date().toLocaleString('pt-BR');

  try {
    await db.execute({
      sql: `
        UPDATE specimens SET
          status = ?,
          verified_by = ?,
          verified_by_id = ?,
          verified_at = ?,
          verification_notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [newStatus, verifierName, verifierId || null, verifiedAt, verificationNotes, id]
    });

    res.json({
      success: true,
      id,
      status: newStatus,
      verifiedBy: verifierName,
      verifiedAt,
      verificationNotes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar espécime da planilha
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({
      sql: 'DELETE FROM specimens WHERE id = ?',
      args: [id]
    });
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

