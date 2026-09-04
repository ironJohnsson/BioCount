import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/layout/Header';
import CounterGrid from './components/counters/CounterGrid';
import RepositoryView from './components/catalog/RepositoryView';
import SpecimenTable from './components/catalog/SpecimenTable';
import SpecimenForm from './components/catalog/SpecimenForm';
import ConflictResolutionModal from './components/catalog/ConflictResolutionModal';
import UserSelectorModal from './components/auth/UserSelectorModal';
import UserManagementModal from './components/admin/UserManagementModal';
import OnlineUsersPanel, { updateMyAction } from './components/collaboration/OnlineUsersPanel';
import AuthScreen from './components/auth/AuthScreen';
import { useAuth } from './context/AuthContext';
import {
  loadCounters,
  saveCounters,
  loadOfficialSpecimens,
  saveOfficialSpecimens,
  loadRepositorySpecimens,
  saveRepositorySpecimens,
  loadSettings,
  saveSettings
} from './utils/storage';
import {
  fetchOfficialSpecimensFromApi,
  fetchRepositorySpecimensFromApi,
  saveSpecimenToApi,
  promoteSpecimenToOfficialApi,
  resolveConflictApi,
  deleteSpecimenFromApi,
  importOfficialSpecimensBatchApi
} from './utils/apiSync';
import { exportSpecimensToCsv } from './utils/exportCsv';
import './App.css';

export default function App() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('repository'); // 'counters' | 'repository' | 'official'
  const [counters, setCounters] = useState(loadCounters);
  const [officialSpecimens, setOfficialSpecimens] = useState(loadOfficialSpecimens);
  const [repositorySpecimens, setRepositorySpecimens] = useState(loadRepositorySpecimens);
  const [settings, setSettings] = useState(loadSettings);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpecimen, setEditingSpecimen] = useState(null);

  // Conflito de Concorrência
  const [conflictData, setConflictData] = useState(null);
  const [isCloudConnected, setIsCloudConnected] = useState(true);

  // Modais de Usuários, Administração e Colaboração
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isOnlineDrawerOpen, setIsOnlineDrawerOpen] = useState(false);

  // Persistência local de segurança
  useEffect(() => {
    saveCounters(counters);
  }, [counters]);

  useEffect(() => {
    saveOfficialSpecimens(officialSpecimens);
  }, [officialSpecimens]);

  useEffect(() => {
    saveRepositorySpecimens(repositorySpecimens);
  }, [repositorySpecimens]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Sincronização contínua em tempo real com o banco (Turso / SQLite)
  const syncWithBackend = useCallback(async () => {
    try {
      const [offList, repoList] = await Promise.all([
        fetchOfficialSpecimensFromApi(),
        fetchRepositorySpecimensFromApi()
      ]);

      if (Array.isArray(offList)) {
        setOfficialSpecimens(offList);
        setIsCloudConnected(true);
      }
      if (Array.isArray(repoList)) {
        setRepositorySpecimens(repoList);
      }
    } catch {
      setIsCloudConnected(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 4000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Atualizar ação de presença do usuário
  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'counters') {
        updateMyAction(currentUser, 'No Contador de Cliques');
      } else if (activeTab === 'repository') {
        updateMyAction(currentUser, isFormOpen ? 'Editando no Repositório' : 'Na Fila de Triagem do Repositório');
      } else if (activeTab === 'official') {
        updateMyAction(currentUser, 'Consultando a Planilha Oficial');
      }
    }
  }, [activeTab, isFormOpen, currentUser]);

  // Se não houver usuário logado, exibe tela de login
  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleToggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Transferir valor do contador para cadastro no repositório
  const handleTransferToCatalog = (counter) => {
    setEditingSpecimen({
      tombo: '',
      species: counter.name,
      count: counter.value,
      notes: `Contado via BioCount [Alvo: ${counter.name}]`,
      analystName: currentUser?.name || ''
    });
    setIsFormOpen(true);
    setActiveTab('repository');
  };

  // Salvar espécime (vai SEMPRE para o Repositório para não poluir a Planilha Oficial)
  const handleSaveSpecimen = async (specimen) => {
    const itemToSave = {
      ...specimen,
      inRepository: true
    };

    if (editingSpecimen?.id) {
      setRepositorySpecimens(prev => prev.map(s => (s.id === itemToSave.id ? itemToSave : s)));
    } else {
      setRepositorySpecimens(prev => [itemToSave, ...prev]);
    }

    setIsFormOpen(false);
    setEditingSpecimen(null);
    setActiveTab('repository');

    // Salvar na API
    await saveSpecimenToApi(itemToSave);
    syncWithBackend();
  };

  // Abrir formulário para edição de rascunho no repositório
  const handleEditSpecimen = (specimen) => {
    setEditingSpecimen(specimen);
    setIsFormOpen(true);
    setActiveTab('repository');
  };

  // Excluir do repositório
  const handleDeleteRepositorySpecimen = async (id) => {
    if (window.confirm('Excluir este rascunho do repositório permanentemente?')) {
      setRepositorySpecimens(prev => prev.filter(s => s.id !== id));
      await deleteSpecimenFromApi(id);
    }
  };

  // Excluir da planilha oficial (apenas administradores/professores)
  const handleDeleteOfficialSpecimen = async (id) => {
    if (window.confirm('Remover este registro oficial da planilha da coleção?')) {
      setOfficialSpecimens(prev => prev.filter(s => s.id !== id));
      await deleteSpecimenFromApi(id);
    }
  };

  // Promover amostra do Repositório para a Planilha Oficial (com Detecção de Conflito)
  const handlePromoteSpecimen = async (specimen) => {
    const code = (specimen.tombo || specimen.countingCode || '').trim().toUpperCase();

    // 1. Tentar promover via API
    const apiRes = await promoteSpecimenToOfficialApi(specimen.id, {
      verifierName: currentUser.name,
      verifierRole: currentUser.role,
      verifierId: currentUser.id,
      verificationNotes: specimen.verificationNotes || 'Auditado e promovido'
    });

    if (apiRes?.conflict) {
      // CONFLITO DETECTADO NO BACKEND: Abrir modal de resolução
      setConflictData({
        officialSpecimen: apiRes.officialSpecimen,
        repositorySpecimen: apiRes.repositorySpecimen
      });
      return;
    }

    // Se a API estiver offline, checar conflito local
    const localConflict = officialSpecimens.find(
      s => (s.tombo || s.countingCode || '').toUpperCase() === code && s.id !== specimen.id
    );

    if (localConflict) {
      setConflictData({
        officialSpecimen: localConflict,
        repositorySpecimen: specimen
      });
      return;
    }

    // Sem conflito: promoção limpa
    const promotedItem = {
      ...specimen,
      inRepository: false,
      status: 'verificado',
      verifiedBy: currentUser.name,
      verifiedById: currentUser.id,
      verifiedAt: new Date().toLocaleString('pt-BR')
    };

    setRepositorySpecimens(prev => prev.filter(s => s.id !== specimen.id));
    setOfficialSpecimens(prev => [promotedItem, ...prev]);

    alert(`Amostra [${code}] promovida com sucesso para a Planilha Oficial da Coleção!`);
    syncWithBackend();
  };

  // Resolução de conflito executada pelo usuário
  const handleResolveConflict = async (resolution, payload) => {
    const { officialId, repositoryId, newCode, verificationNotes } = payload;

    // Enviar para a API
    await resolveConflictApi({
      officialId,
      repositoryId,
      resolution,
      newCode,
      verifierName: currentUser.name,
      verifierId: currentUser.id,
      verificationNotes
    });

    // Atualização local imediata
    const repoItem = repositorySpecimens.find(s => s.id === repositoryId);
    const offItem = officialSpecimens.find(s => s.id === officialId);

    if (resolution === 'replace' && repoItem) {
      const replaced = {
        ...repoItem,
        id: officialId,
        inRepository: false,
        status: 'verificado',
        verifiedBy: currentUser.name,
        verifiedAt: new Date().toLocaleString('pt-BR')
      };
      setOfficialSpecimens(prev => prev.map(s => (s.id === officialId ? replaced : s)));
      setRepositorySpecimens(prev => prev.filter(s => s.id !== repositoryId));
    } else if (resolution === 'merge' && repoItem && offItem) {
      const mergedVars = [...(offItem.variables || [])];
      (repoItem.variables || []).forEach(rv => {
        const idx = mergedVars.findIndex(ov => ov.name?.toLowerCase() === rv.name?.toLowerCase());
        if (idx >= 0) {
          if (rv.value) mergedVars[idx].value = rv.value;
        } else {
          mergedVars.push(rv);
        }
      });
      const merged = {
        ...offItem,
        variables: mergedVars,
        count: Math.max(offItem.count || 1, repoItem.count || 1),
        verifiedBy: currentUser.name,
        verifiedAt: new Date().toLocaleString('pt-BR'),
        notes: [offItem.notes, repoItem.notes].filter(Boolean).join(' | [Mesclado]: ')
      };
      setOfficialSpecimens(prev => prev.map(s => (s.id === officialId ? merged : s)));
      setRepositorySpecimens(prev => prev.filter(s => s.id !== repositoryId));
    } else if (resolution === 'new_code' && repoItem) {
      const derived = {
        ...repoItem,
        tombo: newCode,
        countingCode: newCode,
        inRepository: false,
        status: 'verificado',
        verifiedBy: currentUser.name,
        verifiedAt: new Date().toLocaleString('pt-BR')
      };
      setOfficialSpecimens(prev => [derived, ...prev]);
      setRepositorySpecimens(prev => prev.filter(s => s.id !== repositoryId));
    }

    setConflictData(null);
    alert('Conflito resolvido e dados integrados com segurança à Planilha Oficial!');
    syncWithBackend();
  };

  // Carga inicial / importação em lote da planilha existente para a Planilha Oficial (Turso Cloud)
  const handleImportOfficialBatch = async (importedList) => {
    try {
      // 1. Atualização otimista imediata no estado local
      setOfficialSpecimens(prev => {
        const map = new Map(prev.map(s => [(s.tombo || s.countingCode || '').toUpperCase(), s]));
        importedList.forEach(item => {
          const code = (item.tombo || item.countingCode || '').toUpperCase();
          map.set(code, { ...item, inRepository: false, status: 'verificado' });
        });
        return Array.from(map.values());
      });

      // 2. Persistir no banco de dados (Turso / SQLite)
      const res = await importOfficialSpecimensBatchApi(importedList);
      syncWithBackend();

      if (res?.success) {
        alert(`Sucesso! ${res.count || importedList.length} registro(s) da planilha foram carregados com sucesso no Banco de Dados em Nuvem (Turso) e já estão disponíveis em tempo real na Planilha Oficial para todos os usuários!`);
      } else {
        alert(`${importedList.length} registro(s) foram carregados localmente. (Aguardando sincronização com o banco).`);
      }
    } catch (err) {
      console.error('Erro na importação da planilha:', err);
      alert('Ocorreu um erro ao carregar os dados no banco: ' + err.message);
    }
  };

  const handleQuickExport = () => {
    exportSpecimensToCsv(officialSpecimens);
  };

  return (
    <div className="biocount-app">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCounters={counters.length}
        totalSpecimens={officialSpecimens.length}
        totalRepository={repositorySpecimens.length}
        onQuickExport={handleQuickExport}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onToggleOnlineDrawer={() => setIsOnlineDrawerOpen(prev => !prev)}
      />

      <main className="app-main-content">
        {/* Aba 1: Contador de Cliques Taxonômico */}
        {activeTab === 'counters' && (
          <CounterGrid
            counters={counters}
            onUpdateCounters={setCounters}
            soundEnabled={settings.soundEnabled}
            onToggleSound={handleToggleSound}
            onTransferToCatalog={handleTransferToCatalog}
          />
        )}

        {/* Aba 2: Repositório de Entrada & Triagem (Quarentena / Rascunhos) */}
        {activeTab === 'repository' && (
          <div className="catalog-tab-content">
            {isFormOpen ? (
              <SpecimenForm
                initialData={editingSpecimen}
                existingSpecimens={[...officialSpecimens, ...repositorySpecimens]}
                onSave={handleSaveSpecimen}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingSpecimen(null);
                }}
                counters={counters}
              />
            ) : (
              <RepositoryView
                specimens={repositorySpecimens}
                onAddNew={() => {
                  setEditingSpecimen(null);
                  setIsFormOpen(true);
                }}
                onEditSpecimen={handleEditSpecimen}
                onDeleteSpecimen={handleDeleteRepositorySpecimen}
                onPromoteSpecimen={handlePromoteSpecimen}
                isCloudConnected={isCloudConnected}
              />
            )}
          </div>
        )}

        {/* Aba 3: Planilha Oficial da Coleção (Consolidada & Compartilhada) */}
        {(activeTab === 'official' || activeTab === 'catalog') && (
          <div className="catalog-tab-content">
            <SpecimenTable
              specimens={officialSpecimens}
              onImportSpecimens={handleImportOfficialBatch}
              onEditSpecimen={(sp) => {
                // Editar item oficial cria um rascunho de revisão no repositório
                setEditingSpecimen({ ...sp, id: `rev-${Date.now()}` });
                setIsFormOpen(true);
                setActiveTab('repository');
              }}
              onDeleteSpecimen={handleDeleteOfficialSpecimen}
              onAddNew={() => {
                setEditingSpecimen(null);
                setIsFormOpen(true);
                setActiveTab('repository');
              }}
              onUpdateSpecimen={(updated) => {
                setOfficialSpecimens(prev => prev.map(s => (s.id === updated.id ? updated : s)));
              }}
            />
          </div>
        )}
      </main>

      {/* Modal de Resolução de Conflitos Anti-Sobrescrita */}
      {conflictData && (
        <ConflictResolutionModal
          isOpen={Boolean(conflictData)}
          conflictData={conflictData}
          onClose={() => setConflictData(null)}
          onResolve={handleResolveConflict}
        />
      )}

      {/* Modal de Gestão/Alternância de Usuários */}
      <UserSelectorModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onOpenUserManagement={() => setIsAdminModalOpen(true)}
      />

      {/* Painel do Professor: Promoção e Gestão de Contas */}
      <UserManagementModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Drawer de Usuários Online e Atividades em Tempo Real */}
      <OnlineUsersPanel
        isOpen={isOnlineDrawerOpen}
        onClose={() => setIsOnlineDrawerOpen(false)}
      />
    </div>
  );
}
