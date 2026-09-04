import React, { useState, useEffect } from 'react';
import { Users, Activity, Radio, X, Clock } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';

import { sendHeartbeatToApi, sendActivityToApi } from '../../utils/apiSync';

const PRESENCE_STORAGE_KEY = 'biocount_active_presence';
const ACTIVITY_STORAGE_KEY = 'biocount_activity_feed';

export function logSystemActivity(userName, userRole, actionText, code = null) {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const item = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userName,
      userRole,
      actionText,
      code,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    const updated = [item, ...list].slice(0, 30); // Mantém últimas 30
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('biocount_activity_updated'));
    sendActivityToApi(userName, userRole, actionText, code);
  } catch (e) {
    console.error('Erro ao registrar atividade:', e);
  }
}

export function updateMyAction(user, currentAction) {
  if (!user) return;
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    const presenceMap = raw ? JSON.parse(raw) : {};
    presenceMap[user.id] = {
      id: user.id,
      name: user.name,
      role: user.role,
      action: currentAction,
      lastSeen: Date.now()
    };
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presenceMap));
    window.dispatchEvent(new Event('biocount_presence_updated'));
    sendHeartbeatToApi(user, currentAction);
  } catch (e) {
    console.error('Erro ao atualizar presença:', e);
  }
}

export default function OnlineUsersPanel({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activities, setActivities] = useState([]);

  // Recarregar presenças e atividades
  const refreshData = () => {
    try {
      // Presenças
      const rawPresence = localStorage.getItem(PRESENCE_STORAGE_KEY);
      if (rawPresence) {
        const presenceMap = JSON.parse(rawPresence);
        const now = Date.now();
        // Usuários ativos nos últimos 5 minutos
        const activeList = Object.values(presenceMap).filter(u => now - u.lastSeen < 5 * 60 * 1000);
        setOnlineUsers(activeList);
      } else {
        setOnlineUsers([]);
      }

      // Atividades
      const rawAct = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      if (rawAct) {
        setActivities(JSON.parse(rawAct));
      } else {
        // Mock inicial de demonstração
        setActivities([
          {
            id: 'demo-1',
            userName: 'Ana Silva (Monitora)',
            userRole: 'aluno_validador',
            actionText: 'Validou e auditou a amostra',
            code: 'BIO-2026-001',
            timestamp: '14:20:05'
          },
          {
            id: 'demo-2',
            userName: 'Lucas Oliveira (Estagiário)',
            userRole: 'aluno_treinamento',
            actionText: 'Salvou rascunho com 15 variáveis',
            code: 'BIO-2026-002',
            timestamp: '14:15:30'
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshData();

    // Heartbeat contínuo do usuário ativo
    const heartbeat = setInterval(() => {
      if (currentUser) {
        updateMyAction(currentUser, 'Ativo no sistema BioCount');
      }
      refreshData();
    }, 5000);

    const handlePresenceEvent = () => refreshData();
    const handleActivityEvent = () => refreshData();

    window.addEventListener('biocount_presence_updated', handlePresenceEvent);
    window.addEventListener('biocount_activity_updated', handleActivityEvent);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('biocount_presence_updated', handlePresenceEvent);
      window.removeEventListener('biocount_activity_updated', handleActivityEvent);
    };
  }, [currentUser]);

  if (!isOpen) return null;

  return (
    <div className="online-users-drawer">
      <div className="drawer-header">
        <div className="drawer-title-row">
          <Radio size={18} className="text-emerald pulse-icon" />
          <h3>Colaboração em Tempo Real</h3>
        </div>
        <button type="button" onClick={onClose} className="btn-close">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        {/* Seção 1: Quem está online agora */}
        <div className="drawer-section">
          <div className="drawer-section-header">
            <span className="section-label">
              <Users size={16} /> Contas Conectadas Agora ({onlineUsers.length || 1})
            </span>
            <span className="live-indicator-badge">Ao vivo</span>
          </div>

          <div className="online-users-list">
            {onlineUsers.length === 0 && currentUser && (
              <div className="online-user-item">
                <div className="user-avatar-tiny online-avatar">
                  {currentUser.name.charAt(0)}
                  <span className="status-dot"></span>
                </div>
                <div className="online-user-meta">
                  <div className="online-user-name-line">
                    <strong>{currentUser.name}</strong>
                    <span className={`role-pill ${ROLE_LABELS[currentUser.role]?.badgeClass}`}>
                      {ROLE_LABELS[currentUser.role]?.short}
                    </span>
                  </div>
                  <span className="online-user-action">Ativo no laboratório</span>
                </div>
              </div>
            )}

            {onlineUsers.map((u) => {
              const roleInfo = ROLE_LABELS[u.role];
              const isMe = u.id === currentUser?.id;

              return (
                <div key={u.id} className={`online-user-item ${isMe ? 'is-me' : ''}`}>
                  <div className="user-avatar-tiny online-avatar">
                    {u.name.charAt(0)}
                    <span className="status-dot"></span>
                  </div>
                  <div className="online-user-meta">
                    <div className="online-user-name-line">
                      <strong>{u.name} {isMe && '(Você)'}</strong>
                      <span className={`role-pill ${roleInfo?.badgeClass}`}>
                        {roleInfo?.short}
                      </span>
                    </div>
                    <span className="online-user-action">
                      {u.action || 'Ativo no sistema'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seção 2: Feed de Atividades Recentes */}
        <div className="drawer-section">
          <div className="drawer-section-header">
            <span className="section-label">
              <Activity size={16} /> Histórico de Ações Recentes
            </span>
          </div>

          <div className="activity-feed-list">
            {activities.length === 0 ? (
              <p className="text-muted text-empty">Nenhuma ação registrada ainda.</p>
            ) : (
              activities.map((act) => {
                const roleInfo = ROLE_LABELS[act.userRole];

                return (
                  <div key={act.id} className="activity-item">
                    <div className="activity-icon-col">
                      <Clock size={14} className="text-muted" />
                    </div>
                    <div className="activity-content">
                      <div className="activity-user-row">
                        <strong className="activity-author">{act.userName}</strong>
                        <span className={`role-micro-badge ${roleInfo?.badgeClass}`}>
                          {roleInfo?.short}
                        </span>
                        <span className="activity-time">{act.timestamp}</span>
                      </div>
                      <p className="activity-desc">
                        {act.actionText}
                        {act.code && <span className="activity-code-badge">{act.code}</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
