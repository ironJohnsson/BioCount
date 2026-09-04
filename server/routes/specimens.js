import express from 'express';
import { db } from '../db.js';

const router = express.Router();

function formatSpecimenRow(row) {
  return {
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
    inRepository: row.in_repository !== 0,
    version: row.version || 1,
    updatedAt: row.updated_at
  };
}

// 1. Listar Planilha Oficial da Coleção (somente registros aprovados, in_repository = 0)
router.get('/official', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM specimens WHERE in_repository = 0 ORDER BY updated_at DESC');
    res.json(result.rows.map(formatSpecimenRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Listar Repositório de Triagem & Rascunhos (amostras em andamento/quarentena, in_repository = 1)
router.get('/repository', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM specimens WHERE in_repository = 1 ORDER BY updated_at DESC');
    res.json(result.rows.map(formatSpecimenRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Carga Inicial em Lote para a Planilha Oficial (alimentar banco Turso com planilha existente)
router.post('/batch-official', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body.specimens || [];
  if (items.length === 0) {
    return res.status(400).json({ error: 'Nenhum espécime fornecido para importação.' });
  }

  let countSuccess = 0;
  for (const data of items) {
    const code = (data.tombo || data.countingCode || '').trim().toUpperCase();
    if (!code) continue;

    const id = data.id || `sp-off-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const variablesJson = JSON.stringify(data.variables || []);

    try {
      await db.execute({
        sql: `
          INSERT INTO specimens (
            id, counting_code, analyst_name, analyst_role, status, count,
            order_name, family, genus, species, popular_name, collector,
            date_collected, location, preservation, stage, sex, notes,
            variables_json, verified_by, verified_at, in_repository, version, updated_at
          ) VALUES (?, ?, ?, ?, 'verificado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(counting_code) DO UPDATE SET
            analyst_name = excluded.analyst_name,
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
            in_repository = 0,
            status = 'verificado',
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [
          id,
          code,
          data.analystName || 'Coleção Oficial',
          data.analystRole || 'professor',
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
          data.verifiedBy || 'Carga Inicial da Coleção',
          data.verifiedAt || new Date().toLocaleString('pt-BR')
        ]
      });
      countSuccess++;
    } catch (err) {
      console.error('[BioCount] Erro ao carregar espécime na planilha oficial:', err);
    }
  }

  res.json({ success: true, count: countSuccess, total: items.length });
});

// 3. Listar geral com suporte a query params
router.get('/', async (req, res) => {
  const { view } = req.query;
  try {
    let sql = 'SELECT * FROM specimens ORDER BY updated_at DESC';
    if (view === 'official') {
      sql = 'SELECT * FROM specimens WHERE in_repository = 0 ORDER BY updated_at DESC';
    } else if (view === 'repository') {
      sql = 'SELECT * FROM specimens WHERE in_repository = 1 ORDER BY updated_at DESC';
    }
    const result = await db.execute(sql);
    res.json(result.rows.map(formatSpecimenRow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Checar código de contagem
router.get('/check-code/:code', async (req, res) => {
  const { code } = req.params;
  const normalized = code.trim().toUpperCase();

  try {
    const result = await db.execute({
      sql: 'SELECT id, counting_code, analyst_name, status, in_repository FROM specimens WHERE UPPER(counting_code) = ?',
      args: [normalized]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        exists: true,
        specimen: {
          id: row.id,
          code: row.counting_code,
          analystName: row.analyst_name,
          status: row.status,
          inRepository: row.in_repository !== 0
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Salvar ou Atualizar Espécime no Repositório ou Planilha
router.post('/', async (req, res) => {
  const data = req.body;
  const code = (data.tombo || data.countingCode || '').trim().toUpperCase();

  if (!code) {
    return res.status(400).json({ error: 'Código da contagem é obrigatório' });
  }

  const id = data.id || `sp-${Date.now()}`;
  const status = data.status || 'rascunho';
  const variablesJson = JSON.stringify(data.variables || []);
  // Por padrão novos cadastros entram no Repositório (in_repository = 1)
  const inRepository = data.inRepository !== undefined ? (data.inRepository ? 1 : 0) : 1;

  try {
    await db.execute({
      sql: `
        INSERT INTO specimens (
          id, counting_code, analyst_name, analyst_role, status, count,
          order_name, family, genus, species, popular_name, collector,
          date_collected, location, preservation, stage, sex, notes,
          variables_json, verified_by, verified_by_id, verified_at, verification_notes,
          in_repository, version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
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
          in_repository = excluded.in_repository,
          version = version + 1,
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
        data.verificationNotes || null,
        inRepository
      ]
    });

    res.status(200).json({ success: true, id, countingCode: code, status, inRepository: inRepository === 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Promover Amostra do Repositório para a Planilha Oficial (com Detecção Anti-Sobrescrita)
router.post('/promote/:id', async (req, res) => {
  const { id } = req.params;
  const { verifierName, verifierRole, verifierId, verificationNotes } = req.body;

  if (verifierRole === 'aluno_treinamento' || verifierRole === 'trainee') {
    return res.status(403).json({
      error: 'Acesso negado: Apenas alunos com treinamento finalizado ou professores podem promover amostras para a Planilha Oficial.'
    });
  }

  try {
    // Buscar registro no repositório
    const repoRes = await db.execute({
      sql: 'SELECT * FROM specimens WHERE id = ?',
      args: [id]
    });

    if (repoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado no repositório.' });
    }

    const repoItem = formatSpecimenRow(repoRes.rows[0]);
    const code = (repoItem.countingCode || '').trim().toUpperCase();

    // Checar se este código de tombo já existe na Planilha Oficial (in_repository = 0)
    const conflictRes = await db.execute({
      sql: 'SELECT * FROM specimens WHERE UPPER(counting_code) = ? AND in_repository = 0 AND id != ?',
      args: [code, id]
    });

    if (conflictRes.rows.length > 0) {
      // CONFLITO DETECTADO: não sobrescreve às cegas!
      const officialItem = formatSpecimenRow(conflictRes.rows[0]);
      return res.status(409).json({
        conflict: true,
        message: `O código ${code} já existe na Planilha Oficial! Escolha como deseja tratar esta atualização.`,
        officialSpecimen: officialItem,
        repositorySpecimen: repoItem
      });
    }

    // Sem conflito: promoção direta e segura
    const verifiedAt = new Date().toLocaleString('pt-BR');
    await db.execute({
      sql: `
        UPDATE specimens SET
          in_repository = 0,
          status = 'verificado',
          verified_by = ?,
          verified_by_id = ?,
          verified_at = ?,
          verification_notes = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [verifierName, verifierId || null, verifiedAt, verificationNotes || repoItem.verificationNotes || null, id]
    });

    res.json({
      success: true,
      promoted: true,
      id,
      countingCode: code,
      verifiedBy: verifierName,
      verifiedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Resolução de Conflito de Sobrescrita
router.post('/resolve-conflict', async (req, res) => {
  const {
    repositoryId,
    officialId,
    resolution, // 'merge' | 'replace' | 'new_code'
    newCode,
    verifierName,
    verifierId,
    verificationNotes
  } = req.body;

  try {
    const verifiedAt = new Date().toLocaleString('pt-BR');

    if (resolution === 'replace') {
      // Substituir dados da planilha oficial com a versão auditada do repositório
      const repoRes = await db.execute({ sql: 'SELECT * FROM specimens WHERE id = ?', args: [repositoryId] });
      if (repoRes.rows.length === 0) return res.status(404).json({ error: 'Amostra do repositório não encontrada.' });
      const repo = formatSpecimenRow(repoRes.rows[0]);

      await db.execute({
        sql: `
          UPDATE specimens SET
            analyst_name = ?,
            analyst_role = ?,
            count = ?,
            order_name = ?,
            family = ?,
            genus = ?,
            species = ?,
            popular_name = ?,
            collector = ?,
            date_collected = ?,
            location = ?,
            preservation = ?,
            stage = ?,
            sex = ?,
            notes = ?,
            variables_json = ?,
            verified_by = ?,
            verified_by_id = ?,
            verified_at = ?,
            verification_notes = ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          repo.analystName,
          repo.analystRole,
          repo.count,
          repo.order,
          repo.family,
          repo.genus,
          repo.species,
          repo.popularName,
          repo.collector,
          repo.date,
          repo.location,
          repo.preservation,
          repo.stage,
          repo.sex,
          repo.notes,
          JSON.stringify(repo.variables || []),
          verifierName,
          verifierId || null,
          verifiedAt,
          verificationNotes || repo.verificationNotes || 'Atualizado via substituição autorizada',
          officialId
        ]
      });

      // Remove a versão temporária do repositório
      await db.execute({ sql: 'DELETE FROM specimens WHERE id = ?', args: [repositoryId] });

      return res.json({ success: true, resolution: 'replace', officialId });

    } else if (resolution === 'merge') {
      // Mesclar variáveis das duas amostras
      const [offRes, repoRes] = await Promise.all([
        db.execute({ sql: 'SELECT * FROM specimens WHERE id = ?', args: [officialId] }),
        db.execute({ sql: 'SELECT * FROM specimens WHERE id = ?', args: [repositoryId] })
      ]);

      if (offRes.rows.length === 0 || repoRes.rows.length === 0) {
        return res.status(404).json({ error: 'Registros não encontrados para mesclagem.' });
      }

      const offItem = formatSpecimenRow(offRes.rows[0]);
      const repoItem = formatSpecimenRow(repoRes.rows[0]);

      // Combinar variáveis evitando duplicatas de chave
      const mergedVars = [...(offItem.variables || [])];
      (repoItem.variables || []).forEach(rv => {
        const existingIdx = mergedVars.findIndex(ov => ov.name?.toLowerCase() === rv.name?.toLowerCase());
        if (existingIdx >= 0) {
          if (rv.value) mergedVars[existingIdx].value = rv.value;
        } else {
          mergedVars.push(rv);
        }
      });

      const mergedNotes = [offItem.notes, repoItem.notes].filter(Boolean).join(' | [Submissão]: ');

      await db.execute({
        sql: `
          UPDATE specimens SET
            variables_json = ?,
            notes = ?,
            count = MAX(count, ?),
            verified_by = ?,
            verified_by_id = ?,
            verified_at = ?,
            verification_notes = ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          JSON.stringify(mergedVars),
          mergedNotes,
          repoItem.count || 1,
          verifierName,
          verifierId || null,
          verifiedAt,
          `Mesclado com submissão de ${repoItem.analystName}. ${verificationNotes || ''}`,
          officialId
        ]
      });

      // Remove item do repositório
      await db.execute({ sql: 'DELETE FROM specimens WHERE id = ?', args: [repositoryId] });

      return res.json({ success: true, resolution: 'merge', officialId });

    } else if (resolution === 'new_code') {
      // Renomear código e promover para a planilha oficial como novo registro
      if (!newCode || !newCode.trim()) {
        return res.status(400).json({ error: 'Novo código é obrigatório para derivação.' });
      }

      const cleanNewCode = newCode.trim().toUpperCase();

      await db.execute({
        sql: `
          UPDATE specimens SET
            counting_code = ?,
            in_repository = 0,
            status = 'verificado',
            verified_by = ?,
            verified_by_id = ?,
            verified_at = ?,
            verification_notes = ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          cleanNewCode,
          verifierName,
          verifierId || null,
          verifiedAt,
          `Promovido com código derivado de ${newCode}. ${verificationNotes || ''}`,
          repositoryId
        ]
      });

      return res.json({ success: true, resolution: 'new_code', repositoryId, newCode: cleanNewCode });
    }

    res.status(400).json({ error: 'Modo de resolução desconhecido.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Deletar espécime (do repositório ou da planilha)
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


