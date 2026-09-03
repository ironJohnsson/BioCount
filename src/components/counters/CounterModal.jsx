import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

const PRESET_COLORS = [
  '#059669', // Emerald
  '#0284c7', // Sky Blue
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#0d9488', // Teal
  '#4f46e5', // Indigo
  '#ea580c', // Orange
];

export default function CounterModal({ isOpen, onClose, onSave, editingCounter }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [initialValue, setInitialValue] = useState(0);

  useEffect(() => {
    if (editingCounter) {
      setName(editingCounter.name || '');
      setCategory(editingCounter.category || '');
      setStep(editingCounter.step || 1);
      setGoal(editingCounter.goal || '');
      setColor(editingCounter.color || PRESET_COLORS[0]);
      setInitialValue(editingCounter.value || 0);
    } else {
      setName('');
      setCategory('Morfotipo / Caste');
      setStep(1);
      setGoal('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setInitialValue(0);
    }
  }, [editingCounter, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: editingCounter ? editingCounter.id : `c-${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'Geral',
      step: Math.max(1, parseInt(step, 10) || 1),
      goal: goal ? parseInt(goal, 10) : null,
      color,
      value: editingCounter ? editingCounter.value : Math.max(0, parseInt(initialValue, 10) || 0)
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{editingCounter ? 'Editar Contador' : 'Novo Contador de Cliques'}</h3>
          <button onClick={onClose} className="btn-close" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Nome do Alvo / Espécie / Morfotipo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Operárias, Machos, Larva L3, Morfotipo A"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoria / Grupo</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Sexagem, Estágio, Caste"
              />
            </div>
            <div className="form-group">
              <label>Passo do Clique (+/-)</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={step}
                onChange={(e) => setStep(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            {!editingCounter && (
              <div className="form-group">
                <label>Valor Inicial</label>
                <input
                  type="number"
                  min="0"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label>Meta Opcional (Alvo)</label>
              <input
                type="number"
                min="1"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ex: 50 ou 100"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Cor de Identificação Visual</label>
            <div className="color-picker-palette">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`color-swatch ${color === c ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {editingCounter ? 'Salvar Alterações' : 'Criar Contador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
