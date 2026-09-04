import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import readline from 'node:readline';
import dotenv from 'dotenv';
dotenv.config();

function hashPassword(password) {
  if (!password) return '';
  return crypto.createHash('sha256').update(password).digest('hex');
}

function ask(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('BioCount - Cadastro de Conta de Professor (Turso / SQLite)');
  console.log('======================================================\n');

  let dbUrl = process.env.TURSO_DATABASE_URL;
  let authToken = process.env.TURSO_AUTH_TOKEN;

  // Pegar argumentos da linha de comando: node add-professor.js "Nome" "email" "senha" [url] [token]
  const args = process.argv.slice(2);
  let name = args[0];
  let email = args[1];
  let password = args[2];

  if (args[3]) dbUrl = args[3];
  if (args[4]) authToken = args[4];

  // Se não foi passado pela linha de comando, pedir interativamente
  if (!name) {
    name = await ask('Nome do Professor (ex: Prof. Carlos Eduardo)', 'Professor Responsavel');
  }

  if (!email) {
    email = await ask('E-mail de acesso (ex: professor@biocount.lab)');
  }

  if (!password) {
    password = await ask('Senha de acesso (ex: admin ou senha forte)', 'admin');
  }

  if (!dbUrl) {
    console.log('\nTURSO_DATABASE_URL nao encontrada no arquivo .env.');
    const useTurso = await ask('Deseja conectar ao Turso na Nuvem? (s/n)', 's');
    if (useTurso.toLowerCase().startsWith('s')) {
      dbUrl = await ask('Cole a URL do Turso (ex: libsql://biocount-db-usuario.turso.io)');
      authToken = await ask('Cole o Auth Token do Turso');
    } else {
      dbUrl = 'file:biocount.db';
    }
  }

  const isTurso = !dbUrl.startsWith('file:');
  console.log(`\nConectando ao banco de dados: ${isTurso ? 'Turso Cloud (' + dbUrl + ')' : 'SQLite Local (biocount.db)'}...`);

  const client = createClient({
    url: dbUrl,
    authToken: authToken || undefined
  });

  try {
    // 1. Garantir que as tabelas existem no Turso
    console.log('Verificando e criando tabelas no banco caso nao existam...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL CHECK(lower(role) IN ('professor', 'verificador', 'trainee', 'aluno_validador', 'aluno_treinamento')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await client.execute(`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Ja existe
    }

    await client.execute(`
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS presence (
        user_id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        current_action TEXT,
        last_seen INTEGER NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action_text TEXT NOT NULL,
        code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Inserir ou atualizar a conta de Professor
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const pHash = hashPassword(password);
    const id = `usr-prof-${Date.now()}`;

    // Verificar se usuario ja existe
    const existing = await client.execute({
      sql: 'SELECT id, name, role FROM users WHERE LOWER(email) = ?',
      args: [cleanEmail]
    });

    if (existing.rows.length > 0) {
      // Atualizar para professor
      await client.execute({
        sql: `UPDATE users SET name = ?, password_hash = ?, role = 'professor' WHERE LOWER(email) = ?`,
        args: [cleanName, pHash, cleanEmail]
      });
      console.log(`\nUsuario existente atualizado com sucesso para o cargo de PROFESSOR!`);
    } else {
      // Inserir novo
      await client.execute({
        sql: `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'professor')`,
        args: [id, cleanName, cleanEmail, pHash]
      });
      console.log(`\nNova conta de PROFESSOR inserida com sucesso no banco de dados!`);
    }

    console.log('\n------------------------------------------------------');
    console.log(`Nome:        ${cleanName}`);
    console.log(`E-mail:      ${cleanEmail}`);
    console.log(`Senha:       ${password}`);
    console.log(`Nivel:       professor`);
    console.log(`Destino:     ${isTurso ? 'Turso Cloud' : 'SQLite Local'}`);
    console.log('------------------------------------------------------');
    console.log('\nPronto! Agora voce pode fazer login no BioCount com estas credenciais.');
    console.log('Como Professor, voce podera gerenciar integrantes, emitir acessos e validar qualquer amostra.\n');

  } catch (err) {
    console.error('\nErro ao interagir com o banco de dados:', err.message);
    if (err.message?.includes('authorization') || err.message?.includes('token')) {
      console.error('Dica: Verifique se o TURSO_AUTH_TOKEN e valido e nao expirou.');
    } else if (err.message?.includes('connect') || err.message?.includes('ENOTFOUND')) {
      console.error('Dica: Verifique se a TURSO_DATABASE_URL esta digitada corretamente.');
    }
  }
}

main();

