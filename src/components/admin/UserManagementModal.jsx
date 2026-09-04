import React, { useState } from 'react';
import {
  Shield,
  GraduationCap,
  Clock,
  CheckCircle2,
  X,
  UserPlus,
  Mail,
  Lock,
  User,
  Info,
  ArrowDown
} from 'lucide-react';
import { useAuth, USER_ROLES, ROLE_LABELS } from '../../context/AuthContext';

export default function UserManagementModal({ isOpen, onClose }) {
  const { users, currentUser, promoteUser, registerUser, isProfessor } = useAuth();

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentRole, setNewStudentRole] = useState(USER_ROLES.TRAINEE);
  const [createMsg, setCreateMsg] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const handlePromote = (userId, newRole) => {
    // REGRA: Não pode virar professor
    if (newRole === USER_ROLES.PROFESSOR) {
      alert('Nível de Professor só pode ser concedido diretamente no banco de dados ou código pelo desenvolvedor.');
      return;
    }

    const targetUser = users.find(u => u.id === userId);
    const newRoleInfo = ROLE_LABELS[newRole];
    if (window.confirm(`Deseja alterar o nível de "${targetUser?.name}" para "${newRoleInfo?.title}"?`)) {
      promoteUser(userId, newRole);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setCreateMsg({ text: '', type: '' });

    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) {
      setCreateMsg({ text: 'Preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }

    // REGRA: Professor não pode criar outro professor pela interface
    if (newStudentRole === USER_ROLES.PROFESSOR) {
      setCreateMsg({
        text: 'Nível de Professor não pode ser criado pela interface. Apenas pelo desenvolvedor.',
        type: 'error'
      });
      return;
    }

    const res = await registerUser(
      newStudentName.trim(),
      newStudentEmail.trim(),
      newStudentPassword.trim(),
      newStudentRole
    );

    if (res.success) {
      setCreateMsg({
        text: `Conta de ${newStudentName} criada com sucesso! Forneça o login (${newStudentEmail}) e a senha para o aluno.`,
        type: 'success'
      });
      setNewStudentName('');
      setNewStudentEmail('');
      setNewStudentPassword('');
      setIsCreatingUser(false);
    } else {
      setCreateMsg({ text: res.error || 'Erro ao criar conta.', type: 'error' });
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-admin-card">
        <div className="modal-header">
          <div>
            <div className="modal-badge-row">
              <span className="badge-admin">
                <Shield size={14} className="text-emerald" /> Área do Professor
              </span>
            </div>
            <h3>Gerenciamento de Integrantes & Acessos</h3>
            <p className="modal-subtitle">
              Cadastre novos alunos, forneça credenciais e promova trainees para verificadores
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-content">
          {!isProfessor() ? (
            <div className="alert-box alert-danger">
              <strong>Acesso Restrito</strong>
              <p>Apenas o Professor tem permissão para acessar esta área e gerenciar contas.</p>
            </div>
          ) : (
            <div className="users-management-content">
              {/* Botão para abrir formulário de cadastro de aluno */}
              <div className="admin-actions-bar-top">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(prev => !prev)}
                  className="btn-primary btn-add-student"
                >
                  <UserPlus size={16} />
                  <span>{isCreatingUser ? 'Cancelar Cadastro' : 'Cadastrar Novo Aluno'}</span>
                </button>
              </div>

              {/* Mensagem de sucesso ou erro */}
              {createMsg.text && (
                <div className={`alert-box ${createMsg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: '12px' }}>
                  <p>{createMsg.text}</p>
                </div>
              )}

              {/* Formulário do Professor para Criar Conta de Aluno */}
              {isCreatingUser && (
                <form onSubmit={handleCreateStudent} className="admin-create-user-form">
                  <h4 className="form-sub-heading">
                    <UserPlus size={16} className="text-emerald" />
                    Dados do Novo Integrante
                  </h4>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Nome Completo do Aluno *</label>
                      <div className="input-with-icon">
                        <User size={16} className="input-icon" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Gabriel Martins"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group flex-1">
                      <label>E-mail de Login *</label>
                      <div className="input-with-icon">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="email"
                          required
                          placeholder="Ex: gabriel@biocount.lab"
                          value={newStudentEmail}
                          onChange={(e) => setNewStudentEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Senha Provisória de Acesso *</label>
                      <div className="input-with-icon">
                        <Lock size={16} className="input-icon" />
                        <input
                          type="password"
                          required
                          placeholder="Defina a senha inicial para o aluno"
                          value={newStudentPassword}
                          onChange={(e) => setNewStudentPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group flex-1">
                      <label>Nível Inicial (Apenas Trainee ou Verificador)</label>
                      <select
                        value={newStudentRole}
                        onChange={(e) => setNewStudentRole(e.target.value)}
                      >
                        <option value={USER_ROLES.TRAINEE}>
                          Trainee (Aluno em Treinamento)
                        </option>
                        <option value={USER_ROLES.VERIFICADOR}>
                          Verificador (Treinamento Finalizado)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="form-actions-bar">
                    <button type="button" onClick={() => setIsCreatingUser(false)} className="btn-secondary">
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary">
                      Criar Conta & Emitir Acesso
                    </button>
                  </div>
                </form>
              )}

              {/* Tabela de Integrantes do Laboratório */}
              <div className="users-management-table-wrap">
                <table className="users-admin-table">
                  <thead>
                    <tr>
                      <th>Nome do Integrante</th>
                      <th>E-mail</th>
                      <th>Nível Atual</th>
                      <th className="th-actions">Ações de Promoção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isMe = user.id === currentUser?.id;
                      const roleKey = user.role === 'aluno_validador' ? 'verificador' : user.role === 'aluno_treinamento' ? 'trainee' : user.role;
                      const roleInfo = ROLE_LABELS[roleKey] || ROLE_LABELS.trainee;

                      const isTrainee = user.role === USER_ROLES.TRAINEE || user.role === 'aluno_treinamento';
                      const isVerificador = user.role === USER_ROLES.VERIFICADOR || user.role === 'aluno_validador';
                      const isProf = user.role === USER_ROLES.PROFESSOR;

                      return (
                        <tr key={user.id} className={isMe ? 'tr-highlight-me' : ''}>
                          <td>
                            <div className="user-table-cell">
                              <div className="user-avatar-tiny">{user.name.charAt(0)}</div>
                              <div>
                                <strong>{user.name}</strong>
                                {isMe && <span className="tag-self">(Você)</span>}
                              </div>
                            </div>
                          </td>
                          <td className="text-muted">{user.email}</td>
                          <td>
                            <span className={`role-badge ${roleInfo.badgeClass}`}>
                              {isProf && <Shield size={12} />}
                              {isVerificador && <GraduationCap size={12} />}
                              {isTrainee && <Clock size={12} />}
                              <span>{roleInfo.title}</span>
                            </span>
                          </td>
                          <td className="td-actions">
                            {/* Aluno em Treinamento: pode ser promovido para Verificador */}
                            {isTrainee && (
                              <button
                                type="button"
                                onClick={() => handlePromote(user.id, USER_ROLES.VERIFICADOR)}
                                className="btn-promote-action"
                                title="Promover aluno para verificador (treinamento concluído)"
                              >
                                <GraduationCap size={15} />
                                <span>Promover a Verificador</span>
                              </button>
                            )}

                            {/* Verificador: pode retornar para Trainee (NUNCA pode virar professor pela interface) */}
                            {isVerificador && (
                              <button
                                type="button"
                                onClick={() => handlePromote(user.id, USER_ROLES.TRAINEE)}
                                className="btn-demote-action-pill"
                                title="Retornar para Trainee"
                              >
                                <ArrowDown size={14} />
                                <span>Retornar a Trainee</span>
                              </button>
                            )}

                            {/* Professor: Nível Máximo (concedido via código/dev) */}
                            {isProf && (
                              <span className="badge-max-level">
                                <CheckCircle2 size={15} className="text-emerald" /> Concedido pelo Desenvolvedor
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-instructions-card">
                <div className="instructions-header">
                  <Info size={16} className="text-accent" />
                  <h4>Regras de Nível e Governança do BioCount:</h4>
                </div>
                <ul>
                  <li>
                    <strong>Trainee:</strong> Cadastra espécimes e salva rascunhos. Não pode validar amostras de outros alunos.
                  </li>
                  <li>
                    <strong>Verificador:</strong> Aluno com treinamento finalizado e auditado. Possui autorização para validar amostras de outros integrantes.
                  </li>
                  <li>
                    <strong>Professor:</strong> Nível mais alto de governança. <em>Não pode ser concedido pela interface</em> — qualquer novo Professor só pode ser adicionado diretamente pelo desenvolvedor no código ou banco de dados.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-primary">
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
