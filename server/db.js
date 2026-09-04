import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

// Se houver TURSO_DATABASE_URL e TURSO_AUTH_TOKEN configurados, conecta ao Turso na nuvem.
// Caso contrário, faz fallback automático para SQLite local (arquivo biocount.db), ideal para desenvolvimento ou offline!
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:biocount.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

console.log(`[BioCount DB] Conectando ao banco: ${dbUrl.startsWith('file:') ? 'SQLite Local (' + dbUrl + ')' : 'Turso Cloud Database'}`);

export const db = createClient({
  url: dbUrl,
  authToken: authToken
});

// Função utilitária segura para hash de senha (SHA-256 nativo sem dependências C++/Python)
export function hashPassword(password) {
  if (!password) return '';
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Inicialização e criação de tabelas
export async function initDatabase() {
  try {
    // Tabela de Usuários com Senha e 3 Níveis de Acesso
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK(lower(role) IN ('professor', 'verificador', 'trainee', 'aluno_validador', 'aluno_treinamento')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tentar adicionar coluna password_hash se a tabela já existia sem ela
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Já existe, ignora
    }

    // Tabela de Espécimes com Código de Contagem Único (Anti-Duplicidade)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS specimens (
        id TEXT PRIMARY KEY,
        counting_code TEXT UNIQUE NOT NULL,
        analyst_name TEXT NOT NULL,
        analyst_role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho', 'pendente_verificacao', 'verificado')),
        count INTEGER NOT NULL DEFAULT 1,
        order_name TEXT,
        family TEXT,
        genus TEXT,
        species TEXT,
        popular_name TEXT,
        collector TEXT,
        date_collected TEXT,
        location TEXT,
        preservation TEXT,
        stage TEXT,
        sex TEXT,
        notes TEXT,
        variables_json TEXT,
        verified_by TEXT,
        verified_by_id TEXT,
        verified_at TEXT,
        verification_notes TEXT,
        in_repository INTEGER NOT NULL DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrações graduais caso tabela já exista no Turso ou SQLite
    try {
      await db.execute(`ALTER TABLE specimens ADD COLUMN in_repository INTEGER NOT NULL DEFAULT 1`);
    } catch {}

    try {
      await db.execute(`ALTER TABLE specimens ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
    } catch {}

    // Garantir que espécimes já verificados constem na Planilha Oficial
    try {
      await db.execute(`UPDATE specimens SET in_repository = 0 WHERE status = 'verificado'`);
    } catch {}

    // Tabela de Presença em Tempo Real (Usuários Online)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS presence (
        user_id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        current_action TEXT,
        last_seen INTEGER NOT NULL
      );
    `);

    // Tabela de Log de Atividades do Laboratório
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action_text TEXT NOT NULL,
        code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Garantir que as contas mestres de Professor concedidas pelo desenvolvedor existam
    const masterProfessors = [
      {
        id: 'usr-prof-rodrigo',
        name: 'Rodrigo Johnsson',
        email: 'r.johnsson@gmail.com',
        role: 'professor',
        password: 'senha123'
      },
      {
        id: 'usr-prof-elizabeth',
        name: 'Elizabeth Neves',
        email: 'elizabeth.neves@gmail.com',
        role: 'professor',
        password: 'senha123'
      },
      {
        id: 'usr-prof-master',
        name: 'Professor Responsável',
        email: 'professor@biocount.lab',
        role: 'professor',
        password: 'admin'
      }
    ];

    for (const prof of masterProfessors) {
      const pHash = hashPassword(prof.password);
      const cleanEmail = prof.email.toLowerCase();

      const existing = await db.execute({
        sql: 'SELECT id FROM users WHERE LOWER(email) = ?',
        args: [cleanEmail]
      });

      if (existing.rows.length > 0) {
        await db.execute({
          sql: `UPDATE users SET name = ?, role = 'professor', password_hash = ? WHERE LOWER(email) = ?`,
          args: [prof.name, pHash, cleanEmail]
        });
      } else {
        await db.execute({
          sql: `INSERT OR REPLACE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
          args: [prof.id, prof.name, cleanEmail, pHash, prof.role]
        });
      }
    }

    console.log('[BioCount DB] Tabelas e contas mestres verificadas com sucesso!');
  } catch (error) {
    console.error('[BioCount DB] Erro na inicialização do banco:', error);
  }
}
