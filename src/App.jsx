import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import CounterGrid from './components/counters/CounterGrid';
import SpecimenTable from './components/catalog/SpecimenTable';
import SpecimenForm from './components/catalog/SpecimenForm';
import CameraScanner from './components/scanner/CameraScanner';
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
  const [activeTab, setActiveTab] = useState('counters'); // 'counters' | 'catalog' | 'scanner'
  const [counters, setCounters] = useState(loadCounters);
  const [specimens, setSpecimens] = useState(loadSpecimens);
  const [settings, setSettings] = useState(loadSettings);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpecimen, setEditingSpecimen] = useState(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Persistência automática
  useEffect(() => {
    saveCounters(counters);
  }, [counters]);

  useEffect(() => {
    saveSpecimens(specimens);
  }, [specimens]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleToggleSound = () => {
    setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  // Transferir valor do contador para a catalogação
  const handleTransferToCatalog = (counter) => {
    setEditingSpecimen({
      tombo: '',
      species: counter.name,
      count: counter.value,
      notes: `Contado via BioCount [Alvo: ${counter.name}]`
    });
    setIsFormOpen(true);
    setActiveTab('catalog');
  };

  // Ação ao salvar espécime no formulário
  const handleSaveSpecimen = (specimen) => {
    if (editingSpecimen?.id) {
      setSpecimens(prev => prev.map(s => s.id === specimen.id ? specimen : s));
    } else {
      setSpecimens(prev => [specimen, ...prev]);
    }
    setIsFormOpen(false);
    setEditingSpecimen(null);
  };

  const handleEditSpecimen = (specimen) => {
    setEditingSpecimen(specimen);
    setIsFormOpen(true);
    setActiveTab('catalog');
  };

  const handleDeleteSpecimen = (id) => {
    if (window.confirm('Excluir este espécime da planilha?')) {
      setSpecimens(prev => prev.filter(s => s.id !== id));
    }
  };

  // Aplicar número lido via Câmera OCR
  const handleApplyOcrToForm = (number) => {
    setEditingSpecimen(prev => ({
      ...(prev || {}),
      tombo: number
    }));
    setIsScannerModalOpen(false);
    setIsFormOpen(true);
    setActiveTab('catalog');
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
                onSave={handleSaveSpecimen}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingSpecimen(null);
                }}
                onOpenScanner={() => setIsScannerModalOpen(true)}
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
              />
            )}
          </div>
        )}

        {/* Aba: Scanner Câmera Direto */}
        {activeTab === 'scanner' && (
          <div className="scanner-tab-view">
            <CameraScanner
              onApplyToForm={handleApplyOcrToForm}
            />
          </div>
        )}
      </main>

      {/* Modal Sobreposto do Scanner (quando chamado de dentro do formulário) */}
      {isScannerModalOpen && (
        <CameraScanner
          onApplyToForm={handleApplyOcrToForm}
          onClose={() => setIsScannerModalOpen(false)}
        />
      )}
    </div>
  );
}
