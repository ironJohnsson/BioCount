-- ==========================================================
-- BioCount: Script de Criacao e Configuracao do Banco Turso
-- Execute este arquivo no terminal via Turso CLI:
--   turso db shell <nome-do-banco> < turso-init.sql
-- Ou copie e cole diretamente no SQL Editor do dashboard da Turso
-- ==========================================================

-- 1. Tabela de Usuarios com controle de acesso
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK(lower(role) IN ('professor', 'verificador', 'trainee', 'aluno_validador', 'aluno_treinamento')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Especimes (com codigo unico anti-duplicidade)
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

-- 3. Tabela de Presenca em Tempo Real
CREATE TABLE IF NOT EXISTS presence (
  user_id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  current_action TEXT,
  last_seen INTEGER NOT NULL
);

-- 4. Tabela de Historico de Acoes e Auditoria
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action_text TEXT NOT NULL,
  code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inserir Conta Mestre de Professor (login: professor@biocount.lab / senha: admin)
-- Observacao: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' e o hash SHA-256 de 'admin'
-- Caso queira usar outra senha, o BioCount tambem aceita texto puro que e convertido automaticamente no primeiro login!
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  'usr-prof-master',
  'Professor Responsavel',
  'professor@biocount.lab',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'professor'
)
ON CONFLICT(email) DO UPDATE SET
  name = 'Professor Responsavel',
  role = 'professor',
  password_hash = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

