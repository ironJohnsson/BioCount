import React, { createContext, useContext, useState, useEffect } from 'react';

// Perfis disponíveis no sistema: Professor, Verificador e Trainee
export const USER_ROLES = {
  PROFESSOR: 'professor',
  VERIFICADOR: 'verificador',
  TRAINEE: 'trainee'
};

export const ROLE_LABELS = {
  professor: {
    title: 'Professor (Admin)',
    short: 'Professor',
    badgeClass: 'role-badge-professor',
    description: 'Nível mais alto de controle. Concedido exclusivamente pelo desenvolvedor no código ou banco de dados.'
  },
  verificador: {
    title: 'Verificador',
    short: 'Verificador',
    badgeClass: 'role-badge-validador',
    description: 'Treinamento finalizado. Capacidade e autorização para validar e auditar amostras de outros alunos.'
  },
  trainee: {
    title: 'Trainee',
    short: 'Trainee',
    badgeClass: 'role-badge-trainee',
    description: 'Aluno em treinamento. Cadastra espécimes, salva rascunhos e submete para validação.'
  }
};

// Contas mestre de Professor concedidas via código/desenvolvedor
export const DEFAULT_MASTER_USERS = [
  {
    id: 'usr-prof',
    name: 'Rodrigo Johnsson',
    email: 'r.johnsson@gmail.com',
    role: USER_ROLES.PROFESSOR,
    password: 'senha123'
  },
  {
    id: 'usr-prof-01',
    name: 'Elizabeth Neves',
    email: 'elizabeth.neves@gmail.com',
    role: USER_ROLES.PROFESSOR,
    password: 'senha123'
  },
  {
    id: 'usr-prof-master',
    name: 'Professor Responsável',
    email: 'professor@biocount.lab',
    role: USER_ROLES.PROFESSOR,
    password: 'admin'
  }
];

const AUTH_STORAGE_KEY = 'biocount_active_user_v3';
const USERS_STORAGE_KEY = 'biocount_all_users_v3';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Lista de todos os usuários (sempre mescla as contas mestres para garantir acesso imediato)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const merged = [...DEFAULT_MASTER_USERS];

      if (Array.isArray(parsed)) {
        parsed.forEach(p => {
          const idx = merged.findIndex(m => m.email.toLowerCase() === p.email.toLowerCase());
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...p };
          } else {
            merged.push(p);
          }
        });
      }
      return merged;
    } catch {
      return DEFAULT_MASTER_USERS;
    }
  });

  // Usuário ativo logado (inicia null = tela de login)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch {
      return null;
    }
  });

  // Persistir lista de usuários
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Erro ao persistir usuários:', e);
    }
  }, [users]);

  // Persistir sessão do usuário ativo
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Erro ao persistir usuário ativo:', e);
    }
  }, [currentUser]);

  // Sincronizar dados do usuário ativo com a lista caso haja alteração de cargo
  useEffect(() => {
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated && (updated.role !== currentUser.role || updated.name !== currentUser.name)) {
        setCurrentUser(updated);
      }
    }
  }, [users, currentUser]);

  // Sincronizar usuários da API backend (Turso/SQLite) ao iniciar
  useEffect(() => {
    fetch('/api/users')
      .then(res => (res.ok ? res.json() : null))
      .then(apiUsers => {
        if (Array.isArray(apiUsers) && apiUsers.length > 0) {
          setUsers(prev => {
            const merged = [...prev];
            apiUsers.forEach(au => {
              const idx = merged.findIndex(m => m.email.toLowerCase() === au.email.toLowerCase());
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...au };
              } else {
                merged.push(au);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {
        // Fallback silencioso offline
      });
  }, []);

  // Função de Login
  const login = async (emailOrUsername, password) => {
    const term = emailOrUsername.trim().toLowerCase();

    // Tentar autenticar via API backend se disponível
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: term, password })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        return { success: true, user: data.user };
      }
    } catch {
      // Fallback para autenticação local
    }

    // Validação local
    const user = users.find(
      u => (u.email.toLowerCase() === term || u.name.toLowerCase() === term)
    );

    if (!user) {
      return { success: false, error: 'Usuário ou e-mail não encontrado. Solicite seu cadastro ao Professor.' };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    setCurrentUser(user);
    return { success: true, user };
  };

  // Cadastro de Novo Integrante (Apenas Professor pode executar)
  const registerUser = async (name, email, password, role = USER_ROLES.TRAINEE) => {
    if (currentUser?.role !== USER_ROLES.PROFESSOR) {
      return { success: false, error: 'Apenas o Professor tem permissão para cadastrar novas contas.' };
    }

    if (role === USER_ROLES.PROFESSOR) {
      return {
        success: false,
        error: 'Contas de Professor só podem ser criadas diretamente no banco de dados ou código pelo desenvolvedor.'
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Este e-mail já está cadastrado.' };
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      password: password,
      role: role
    };

    // Tentar salvar no backend
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          role,
          requesterRole: currentUser.role
        })
      });
    } catch {
      // Fallback local
    }

    setUsers(prev => [...prev, newUser]);
    return { success: true, user: newUser };
  };

  // Deslogar
  const logout = () => {
    setCurrentUser(null);
  };

  // Promover ou alterar nível (Apenas entre Trainee e Verificador)
  const promoteUser = async (userId, newRole) => {
    if (currentUser?.role !== USER_ROLES.PROFESSOR) {
      alert('Apenas professores têm autorização para alterar o nível de outras contas.');
      return false;
    }

    // REGRA RÍGIDA: Um verificador não pode virar professor pela interface!
    if (newRole === USER_ROLES.PROFESSOR) {
      alert('Acesso negado: O cargo de Professor só pode ser concedido diretamente no banco de dados ou código pelo desenvolvedor.');
      return false;
    }

    try {
      await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, requesterRole: currentUser.role })
      });
    } catch {
      // Fallback local
    }

    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
    );

    return true;
  };

  // Checagens de permissão
  const canValidate = () => {
    if (!currentUser) return false;
    return (
      currentUser.role === USER_ROLES.PROFESSOR ||
      currentUser.role === USER_ROLES.VERIFICADOR ||
      currentUser.role === 'aluno_validador'
    );
  };

  const isProfessor = () => {
    return currentUser?.role === USER_ROLES.PROFESSOR;
  };

  const isTrainee = () => {
    return currentUser?.role === USER_ROLES.TRAINEE || currentUser?.role === 'aluno_treinamento';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        registerUser,
        logout,
        promoteUser,
        canValidate,
        isProfessor,
        isTrainee,
        setCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
