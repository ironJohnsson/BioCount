import React from 'react';
import { Plus, Minus, RotateCcw, Edit2, Trash2, ArrowRightCircle } from 'lucide-react';
import { playClickSound, playDecrementSound, playResetSound, triggerHaptic } from '../../utils/sound';

export default function CounterCard({
  counter,
  soundEnabled,
  onIncrement,
  onDecrement,
  onReset,
  onEdit,
  onDelete,
  onTransferToCatalog
}) {
  const handleIncrement = (e) => {
    e.stopPropagation();
    if (soundEnabled) playClickSound();
    triggerHaptic(18);
    onIncrement(counter.id, counter.step || 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (counter.value > 0) {
      if (soundEnabled) playDecrementSound();
      triggerHaptic(14);
      onDecrement(counter.id, counter.step || 1);
    }
  };

  const handleReset = (e) => {
    e.stopPropagation();
    if (window.confirm(`Zerar o contador "${counter.name}"?`)) {
      if (soundEnabled) playResetSound();
      triggerHaptic(30);
      onReset(counter.id);
    }
  };

  const percent = counter.goal ? Math.min(100, Math.round((counter.value / counter.goal) * 100)) : null;

  return (
    <div
      className="counter-card"
      style={{ '--card-accent': counter.color || '#059669' }}
    >
      {/* Barra de cabeçalho do Card */}
      <div className="card-top">
        <div className="card-meta">
          <span className="card-category">{counter.category || 'Geral'}</span>
          <h3 className="card-title">{counter.name}</h3>
        </div>
        <div className="card-quick-actions">
          <button
            onClick={() => onEdit(counter)}
            className="btn-card-tool"
            title="Editar contador"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(counter.id)}
            className="btn-card-tool btn-danger-hover"
            title="Excluir contador"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Meta e Barra de Progresso */}
      {counter.goal && (
        <div className="goal-container">
          <div className="goal-labels">
            <span>Meta: {counter.goal}</span>
            <span>{percent}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${percent}%`, backgroundColor: counter.color }}></div>
          </div>
        </div>
      )}

      {/* Display Central do Valor */}
      <div className="counter-display" onClick={handleIncrement} title="Clique em qualquer lugar do número para +1">
        <span className="counter-digit" style={{ color: counter.color || '#fff' }}>
          {counter.value}
        </span>
        <span className="step-badge">Passo: +{counter.step || 1}</span>
      </div>

      {/* Botões Táteis de Ação (+ e -) */}
      <div className="counter-actions">
        <button
          onClick={handleDecrement}
          disabled={counter.value <= 0}
          className="btn-counter-action btn-decrement"
          title={`Subtrair ${counter.step || 1}`}
        >
          <Minus size={28} strokeWidth={2.5} />
        </button>

        <button
          onClick={handleIncrement}
          className="btn-counter-action btn-increment"
          title={`Adicionar ${counter.step || 1}`}
          style={{ backgroundColor: counter.color }}
        >
          <Plus size={36} strokeWidth={3} />
        </button>
      </div>

      {/* Rodapé: Reset e Enviar para Ficha */}
      <div className="card-footer">
        <button
          onClick={handleReset}
          className="btn-footer-secondary"
          title="Zerar este contador"
        >
          <RotateCcw size={14} />
          <span>Zerar</span>
        </button>

        {onTransferToCatalog && (
          <button
            onClick={() => onTransferToCatalog(counter)}
            className="btn-footer-primary"
            title="Preencher ficha de catalogação com este valor"
          >
            <span>Catalogar</span>
            <ArrowRightCircle size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
