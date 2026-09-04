import React from 'react';
import {
  Layers,
  TableProperties,
  Inbox,
  Bug,
  FileSpreadsheet,
  Users,
  Shield,
  GraduationCap,
  Clock,
  LogOut
} from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

export default function Header({
  activeTab,
  setActiveTab,
  totalCounters,
  totalSpecimens,
  totalRepository = 0,
  onQuickExport,
  onOpenUserModal,
  onOpenAdminModal,
  onToggleOnlineDrawer
}) {
  const { currentUser, isProfessor, logout } = useAuth();
  const roleInfo = ROLE_LABELS[currentUser?.role] || ROLE_LABELS.trainee;

  const handleLogout = () => {
    if (window.confirm(`Deseja sair da conta "${currentUser?.name}"?`)) {
      logout();
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo-badge">
          <Bug size={26} className="text-emerald" />
        </div>
        <div className="brand-texts">
          <div className="brand-title-row">
            <h1 className="brand-title">BioCount</h1>
            <span className="brand-tag">Coleções Biológicas</span>
          </div>
          <p className="brand-tagline">Repositório de Triagem & Planilha Oficial Colaborativa</p>
        </div>
      </div>

      {/* Navegação por Abas Principais (Contador, Repositório e Planilha Oficial) */}
      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === 'counters' ? 'active' : ''}`}
          onClick={() => setActiveTab('counters')}
        >
          <Layers size={18} />
          <span>Contador</span>
          {totalCounters > 0 && <span className="tab-pill">{totalCounters}</span>}
        </button>

        <button
          className={`nav-tab nav-tab-repo ${activeTab === 'repository' ? 'active' : ''}`}
          onClick={() => setActiveTab('repository')}
          title="Área de quarentena: rascunhos e amostras aguardando validação"
        >
          <Inbox size={18} />
          <span>Repositório (Triagem)</span>
          {totalRepository > 0 && <span className="tab-pill tab-pill-warning">{totalRepository}</span>}
        </button>

        <button
          className={`nav-tab ${activeTab === 'official' || activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('official')}
          title="Planilha Oficial da Coleção: apenas dados consolidados e auditados"
        >
          <TableProperties size={18} />
          <span>Planilha Oficial</span>
          {totalSpecimens > 0 && <span className="tab-pill">{totalSpecimens}</span>}
        </button>
      </nav>

      {/* Ações Rápidas & Usuário */}
      <div className="header-actions">
        {/* Botão de Usuários Online & Colaboração em Tempo Real */}
        <button
          type="button"
          onClick={onToggleOnlineDrawer}
          className="btn-header-online"
          title="Ver contas conectadas e atividades em tempo real"
        >
          <span className="pulse-indicator-dot"></span>
          <Users size={16} />
          <span className="btn-text">Online</span>
        </button>

        {/* Botão de Exportar Planilha */}
        <button
          onClick={onQuickExport}
          className="btn-header-export"
          title="Exportar dados diretamente para planilha Excel/CSV"
        >
          <FileSpreadsheet size={16} />
          <span className="btn-text">Exportar Planilha</span>
        </button>

        {/* Identificação da Conta Ativa e Nível */}
        <div className="user-profile-header-pill" onClick={onOpenUserModal} title="Clique para gerenciar ou alternar conta">
          <div className="user-avatar-header">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="user-info-header">
            <span className="user-name-header">{currentUser?.name}</span>
            <span className={`user-role-header-badge ${roleInfo.badgeClass}`}>
              {currentUser?.role === 'professor' && <Shield size={12} />}
              {(currentUser?.role === 'verificador' || currentUser?.role === 'aluno_validador') && <GraduationCap size={12} />}
              {(currentUser?.role === 'trainee' || currentUser?.role === 'aluno_treinamento') && <Clock size={12} />}
              <span>{roleInfo.short}</span>
            </span>
          </div>
        </div>

        {/* Atalho exclusivo de Gestão de Contas para Professores */}
        {isProfessor() && (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="btn-header-admin"
            title="Painel do Professor: Promover e gerenciar contas"
          >
            <Shield size={16} className="text-emerald" />
            <span className="btn-text">Gestão</span>
          </button>
        )}

        {/* Botão de Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="btn-header-logout"
          title="Sair da conta"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
