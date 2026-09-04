import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import CounterGrid from './components/counters/CounterGrid';
import SpecimenTable from './components/catalog/SpecimenTable';
import SpecimenForm from './components/catalog/SpecimenForm';
import UserSelectorModal from './components/auth/UserSelectorModal';
import UserManagementModal from './components/admin/UserManagementModal';
import OnlineUsersPanel, { updateMyAction } from './components/collaboration/OnlineUsersPanel';
import AuthScreen from './components/auth/AuthScreen';
import { useAuth } from './context/AuthContext';
import {
  loadCounters,
  saveCounters,
  loadSpecimens,
  saveSpecimens,
  loadSettings,
  saveSettings
} from './utils/storage';
import { exportSpecimensToCsv } from './utils/exportCsv';
import './App.css';

export default function App() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('counters'); // 'counters' | 'catalog'
  const [counters, setCounters] = useState(loadCounters);
  const [specimens, setSpecimens] = useState(loadSpecimens);
  const [settings, setSettings] = useState(loadSettings);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpecimen, setEditingSpecimen] = useState(null);

  // Modais de Usuários, Administração e Colaboração
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isOnlineDrawerOpen, setIsOnlineDrawerOpen] = useState(false);

  // Persistência automática no LocalStorage
  useEffect(() => {
    saveCounters(counters);
  }, [counters]);

  useEffect(() => {
    saveSpecimens(specimens);
  }, [specimens]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Atualizar status de presença quando troca de aba
  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'counters') {
        updateMyAction(currentUser, 'No Contador de Cliques');
      } else if (activeTab === 'catalog') {
        updateMyAction(currentUser, isFormOpen ? 'Editando formulário' : 'Consultando a Planilha');
      }
    }
  }, [activeTab, isFormOpen, currentUser]);

  // SE NÃO HOUVER USUÁRIO LOGADO, EXIBE A TELA DE LOGIN / CADASTRO
  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleToggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Transferir valor do contador para a catalogação
  const handleTransferToCatalog = (counter) => {
    setEditingSpecimen({
      tombo: '',
      species: counter.name,
      count: counter.value,
      notes: `Contado via BioCount [Alvo: ${counter.name}]`,
      analystName: currentUser?.name || ''
    });
    setIsFormOpen(true);
    setActiveTab('catalog');
  };

  // Ação ao salvar espécime no formulário (seja rascunho, pendente ou verificado)
  const handleSaveSpecimen = (specimen) => {
    if (editingSpecimen?.id) {
      setSpecimens(prev => prev.map(s => (s.id === specimen.id ? specimen : s)));
    } else {
      setSpecimens(prev => [specimen, ...prev]);
    }
    setIsFormOpen(false);
    setEditingSpecimen(null);
  };

  // Atualização direta da amostra (ex: após verificação/auditoria)
  const handleUpdateSpecimen = (updatedSpecimen) => {
    setSpecimens(prev => prev.map(s => (s.id === updatedSpecimen.id ? updatedSpecimen : s)));
  };

  // Importação em lote de planilha CSV com detecção de duplicidades / códigos existentes
  const handleImportSpecimens = (importedList) => {
    setSpecimens(prev => {
      const existingMap = new Map();
      prev.forEach(s => {
        const key = (s.tombo || s.countingCode || '').trim().toLowerCase();
        if (key) existingMap.set(key, s);
      });

      const newItems = [];
      const updatedExisting = new Map(existingMap);

      importedList.forEach(item => {
        const key = (item.tombo || item.countingCode || '').trim().toLowerCase();
        if (key && updatedExisting.has(key)) {
          // Atualiza dados na planilha existente preservando o ID
          const existing = updatedExisting.get(key);
          updatedExisting.set(key, { ...existing, ...item, id: existing.id });
        } else {
          newItems.push(item);
        }
      });

      return [...newItems, ...Array.from(updatedExisting.values())];
    });
  };

  const handleEditSpecimen = (specimen) => {
    setEditingSpecimen(specimen);
    setIsFormOpen(true);
    setActiveTab('catalog');
  };

  const handleDeleteSpecimen = (id) => {
    if (window.confirm('Excluir este espécime da planilha permanentemente?')) {
      setSpecimens(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleQuickExport = () => {
    exportSpecimensToCsv(specimens);
  };

  return (
    <div className="biocount-app">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCounters={counters.length}
        totalSpecimens={specimens.length}
        onQuickExport={handleQuickExport}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onToggleOnlineDrawer={() => setIsOnlineDrawerOpen(prev => !prev)}
      />

      <main className="app-main-content">
        {/* Aba: Contador de Cliques */}
        {activeTab === 'counters' && (
          <CounterGrid
            counters={counters}
            onUpdateCounters={setCounters}
            soundEnabled={settings.soundEnabled}
            onToggleSound={handleToggleSound}
            onTransferToCatalog={handleTransferToCatalog}
          />
        )}

        {/* Aba: Catalogação & Planilha */}
        {activeTab === 'catalog' && (
          <div className="catalog-tab-content">
            {isFormOpen ? (
              <SpecimenForm
                initialData={editingSpecimen}
                existingSpecimens={specimens}
                onSave={handleSaveSpecimen}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingSpecimen(null);
                }}
                counters={counters}
              />
            ) : (
              <SpecimenTable
                specimens={specimens}
                onEditSpecimen={handleEditSpecimen}
                onDeleteSpecimen={handleDeleteSpecimen}
                onAddNew={() => {
                  setEditingSpecimen(null);
                  setIsFormOpen(true);
                }}
                onUpdateSpecimen={handleUpdateSpecimen}
                onImportSpecimens={handleImportSpecimens}
              />
            )}
          </div>
        )}
      </main>

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
