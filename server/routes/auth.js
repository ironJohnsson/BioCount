import express from 'express';
import { db, hashPassword } from '../db.js';

const router = express.Router();

function toDbRole(r) {
  if (r === 'trainee') return 'aluno_treinamento';
  if (r === 'verificador') return 'aluno_validador';
  return r;
}

function toClientRole(r) {
  if (r === 'aluno_treinamento') return 'trainee';
  if (r === 'aluno_validador') return 'verificador';
  return r;
}

// 1. Cadastrar nova conta com senha e nível (Professor, Verificador, Trainee)
router.post('/auth/register', async (req, res) => {
  const { name, email, password, role = 'trainee' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const validRoles = ['professor', 'verificador', 'trainee', 'aluno_validador', 'aluno_treinamento'];

  if (role === 'professor') {
    return res.status(403).json({
      error: 'Acesso negado: Contas de Professor só podem ser criadas diretamente no banco de dados pelo desenvolvedor.'
    });
  }

  const dbRole = toDbRole(role);
  const clientRole = toClientRole(dbRole);

  try {
    // Verificar duplicidade de e-mail
    const checkEmail = await db.execute({
      sql: 'SELECT id FROM users WHERE LOWER(email) = ?',
      args: [cleanEmail]
    });

    if (checkEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    const id = `usr-${Date.now()}`;
    const pHash = hashPassword(password);

    await db.execute({
      sql: 'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      args: [id, cleanName, cleanEmail, pHash, dbRole]
    });

    const user = { id, name: cleanName, email: cleanEmail, role: clientRole };
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Login com Senha
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe o e-mail/usuário e a senha.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const pHash = hashPassword(password);

  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, password_hash, role FROM users WHERE LOWER(email) = ? OR LOWER(name) = ?',
      args: [cleanEmail, cleanEmail]
    });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário ou e-mail não encontrado.' });
    }

    const user = result.rows[0];

    // Verificar hash da senha
    if (user.password_hash && user.password_hash !== pHash) {
      return res.status(401).json({ error: 'Senha incorreta. Tente novamente.' });
    }

    // Retornar usuário sem expor o hash da senha
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: toClientRole(user.role)
    };

    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Logout
router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Desconectado com sucesso.' });
});

// 4. Listar todos os usuários (para gestão de contas e colaboração)
router.get('/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC');
    const users = result.rows.map(u => ({
      ...u,
      role: toClientRole(u.role)
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Promover ou alterar nível de usuário (Exclusivo para Professor)
router.put('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role, requesterRole } = req.body;

  if (requesterRole !== 'professor') {
    return res.status(403).json({
      error: 'Acesso negado: Apenas professores têm autorização para promover ou alterar o nível de outras contas.'
    });
  }

  if (role === 'professor') {
    return res.status(403).json({
      error: 'Acesso negado: O nível de Professor não pode ser atribuído pela aplicação. Somente o desenvolvedor pode conceder acesso de Professor diretamente no banco de dados ou código.'
    });
  }

  const validRoles = ['verificador', 'trainee', 'aluno_validador', 'aluno_treinamento'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Nível inválido' });
  }

  const dbRole = toDbRole(role);
  const clientRole = toClientRole(dbRole);

  try {
    await db.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: [dbRole, id]
    });
    res.json({ success: true, id, role: clientRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
