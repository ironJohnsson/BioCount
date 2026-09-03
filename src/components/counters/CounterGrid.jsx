import React, { useState, useMemo } from 'react';
import { Plus, Volume2, VolumeX, FileSpreadsheet, RotateCcw, Filter, Layers } from 'lucide-react';
import CounterCard from './CounterCard';
import CounterModal from './CounterModal';
import { exportCountersToCsv } from '../../utils/exportCsv';

export default function CounterGrid({
  counters,
  onUpdateCounters,
  soundEnabled,
  onToggleSound,
  onTransferToCatalog
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(counters.map(c => c.category || 'Geral'));
    return ['ALL', ...Array.from(cats)];
  }, [counters]);

  // Contadores filtrados
  const filteredCounters = useMemo(() => {
    if (selectedCategory === 'ALL') return counters;
    return counters.filter(c => (c.category || 'Geral') === selectedCategory);
  }, [counters, selectedCategory]);

  // Estatísticas
  const totalCount = useMemo(() => {
    return counters.reduce((sum, c) => sum + (c.value || 0), 0);
  }, [counters]);

  const handleIncrement = (id, step) => {
    onUpdateCounters(counters.map(c => c.id === id ? { ...c, value: c.value + step } : c));
  };

  const handleDecrement = (id, step) => {
    onUpdateCounters(counters.map(c => c.id === id ? { ...c, value: Math.max(0, c.value - step) } : c));
  };

  const handleReset = (id) => {
    onUpdateCounters(counters.map(c => c.id === id ? { ...c, value: 0 } : c));
  };

  const handleResetAll = () => {
    if (window.confirm('Tem certeza que deseja zerar TODOS os contadores?')) {
      onUpdateCounters(counters.map(c => ({ ...c, value: 0 })));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Excluir este contador?')) {
      onUpdateCounters(counters.filter(c => c.id !== id));
    }
  };

  const handleOpenEdit = (counter) => {
    setEditingCounter(counter);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingCounter(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = (saved) => {
    if (editingCounter) {
      onUpdateCounters(counters.map(c => c.id === saved.id ? saved : c));
    } else {
      onUpdateCounters([...counters, saved]);
    }
  };

  return (
    <div className="counter-section">
      {/* Barra de Status e Métricas Gerais */}
      <div className="metrics-banner">
        <div className="metric-item">
          <span className="metric-label">Total de Indivíduos Contados</span>
          <span className="metric-big-val">{totalCount.toLocaleString('pt-BR')}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Contadores Ativos</span>
          <span className="metric-val">{counters.length}</span>
        </div>

        {/* Ações da Barra */}
        <div className="banner-toolbar">
          <button
            onClick={onToggleSound}
            className={`btn-toolbar-icon ${soundEnabled ? 'active' : ''}`}
            title={soundEnabled ? 'Som ativado (clique para silenciar)' : 'Som mudo (clique para ativar)'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="toolbar-text">{soundEnabled ? 'Som Ligado' : 'Mudo'}</span>
          </button>

          <button
            onClick={() => exportCountersToCsv(counters)}
            className="btn-toolbar-icon"
            title="Exportar contadores para CSV / Excel"
          >
            <FileSpreadsheet size={18} />
            <span className="toolbar-text">Exportar CSV</span>
          </button>

          <button
            onClick={handleResetAll}
            className="btn-toolbar-icon btn-danger-text"
            title="Zerar todos os contadores"
          >
            <RotateCcw size={18} />
            <span className="toolbar-text">Zerar Todos</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="btn-primary btn-add-counter"
          >
            <Plus size={18} />
            <span>Novo Contador</span>
          </button>
        </div>
      </div>

      {/* Filtros de Categoria */}
      {categories.length > 2 && (
        <div className="category-tabs">
          <div className="cat-icon-label">
            <Filter size={15} />
            <span>Filtrar:</span>
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`cat-chip ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat === 'ALL' ? 'Todos os Alvos' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Grade de Cards de Contagem */}
      {filteredCounters.length === 0 ? (
        <div className="empty-state-box">
          <Layers size={48} className="text-muted" />
          <p>Nenhum contador encontrado nesta categoria.</p>
          <button onClick={handleOpenNew} className="btn-primary mt-2">
            Criar Primeiro Contador
          </button>
        </div>
      ) : (
        <div className="counter-cards-grid">
          {filteredCounters.map(counter => (
            <CounterCard
              key={counter.id}
              counter={counter}
              soundEnabled={soundEnabled}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onReset={handleReset}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onTransferToCatalog={onTransferToCatalog}
            />
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <CounterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingCounter={editingCounter}
      />
    </div>
  );
}
