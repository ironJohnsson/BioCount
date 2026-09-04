import React from 'react';
import { UserCheck, Shield, GraduationCap, Clock, X, ArrowRight, LogOut } from 'lucide-react';
import { useAuth, USER_ROLES, ROLE_LABELS } from '../../context/AuthContext';

export default function UserSelectorModal({ isOpen, onClose, onOpenUserManagement }) {
  const { currentUser, users, login, isProfessor, logout } = useAuth();

  if (!isOpen) return null;

  const handleSelect = (user) => {
    login(user.email, user.password || 'admin');
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const activeRoleKey = currentUser?.role === 'aluno_validador' ? 'verificador' : currentUser?.role === 'aluno_treinamento' ? 'trainee' : currentUser?.role;
  const activeRoleInfo = ROLE_LABELS[activeRoleKey] || ROLE_LABELS.trainee;

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-auth-card">
        <div className="modal-header">
          <div>
            <h3>Contas do Laboratório</h3>
            <p className="modal-subtitle">
              Alterne de conta ou gerencie os acessos do BioCount
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-content">
          {/* Conta Ativa Atual */}
          {currentUser && (
            <div className="current-user-banner">
              <div className="user-avatar-large">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <span className="user-active-tag">Conectado agora como:</span>
                <strong className="user-active-name">{currentUser?.name}</strong>
                <div className="user-role-line">
                  <span className={`role-badge ${activeRoleInfo.badgeClass}`}>
                    {currentUser?.role === USER_ROLES.PROFESSOR && <Shield size={12} />}
                    {(currentUser?.role === USER_ROLES.VERIFICADOR || currentUser?.role === 'aluno_validador') && <GraduationCap size={12} />}
                    {(currentUser?.role === USER_ROLES.TRAINEE || currentUser?.role === 'aluno_treinamento') && <Clock size={12} />}
                    <span>{activeRoleInfo.title}</span>
                  </span>
                </div>
                <small className="user-role-desc">
                  {activeRoleInfo.description}
                </small>
              </div>
            </div>
          )}

          {/* Se for professor, atalho para gerenciamento */}
          {isProfessor() && (
            <div className="professor-actions-callout">
              <div className="callout-text">
                <strong>Área de Governança do Professor</strong>
                <p>Cadastre novos alunos, emita senhas e promova trainees para verificadores.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserManagement();
                }}
                className="btn-promote-shortcut"
              >
                Painel de Gestão <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Alternar entre Contas Existentes */}
          <div className="auth-section-title">
            <span>Contas Disponíveis</span>
          </div>

          <div className="users-list-grid">
            {users.map((user) => {
              const isSelected = user.id === currentUser?.id;
              const roleKey = user.role === 'aluno_validador' ? 'verificador' : user.role === 'aluno_treinamento' ? 'trainee' : user.role;
              const roleInfo = ROLE_LABELS[roleKey] || ROLE_LABELS.trainee;

              return (
                <div
                  key={user.id}
                  className={`user-card-selectable ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(user)}
                >
                  <div className="user-card-header">
                    <div className="user-avatar-small">
                      {user.name.charAt(0)}
                    </div>
                    <div className="user-card-info">
                      <strong className="user-card-name">{user.name}</strong>
                      <span className="user-card-email">{user.email}</span>
                    </div>
                    {isSelected && (
                      <span className="user-selected-indicator" title="Conta ativa">
                        <UserCheck size={18} className="text-emerald" />
                      </span>
                    )}
                  </div>
                  <div className="user-card-footer">
                    <span className={`role-badge ${roleInfo.badgeClass}`}>
                      {user.role === USER_ROLES.PROFESSOR && <Shield size={11} />}
                      {(user.role === USER_ROLES.VERIFICADOR || user.role === 'aluno_validador') && <GraduationCap size={11} />}
                      {(user.role === USER_ROLES.TRAINEE || user.role === 'aluno_treinamento') && <Clock size={11} />}
                      <span>{roleInfo.short}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" onClick={handleLogout} className="btn-danger-text">
            <LogOut size={16} /> Sair da Conta (Logout)
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
