import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Save, X, Sparkles, Hash, Calendar, User, Compass } from 'lucide-react';
import VoiceInputButton from '../voice/VoiceInputButton';

const PRESERVATION_TYPES = [
  'Seco / Alfinete Entomológico',
  'Álcool 70%',
  'Álcool 96%',
  'Lâmina Microscópica',
  'Congelado / -80°C',
  'Formalina',
  'Exsicata / Herbário',
  'Outro'
];

const LIFE_STAGES = ['Adulto', 'Ninfa', 'Larva', 'Pupa', 'Ovo', 'Juvenil', 'Indeterminado'];
const SEX_TYPES = ['Indeterminado', 'Macho', 'Fêmea', 'Hermafrodita', 'Operária', 'Ginete'];

export default function SpecimenForm({
  initialData,
  onSave,
  onCancel,
  onOpenScanner,
  counters = []
}) {
  const [formData, setFormData] = useState({
    tombo: '',
    order: '',
    family: '',
    genus: '',
    species: '',
    popularName: '',
    count: 1,
    collector: '',
    date: new Date().toISOString().slice(0, 10),
    location: '',
    preservation: PRESERVATION_TYPES[0],
    stage: LIFE_STAGES[0],
    sex: SEX_TYPES[0],
    notes: ''
  });

  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' ? Math.max(1, parseInt(value, 10) || 1) : value
    }));
  };

  const handleVoiceTombo = (recognizedText) => {
    setFormData(prev => ({ ...prev, tombo: recognizedText.toUpperCase() }));
  };

  const handleVoiceCount = (recognizedNum) => {
    const num = parseInt(recognizedNum, 10);
    if (!isNaN(num) && num > 0) {
      setFormData(prev => ({ ...prev, count: num }));
    }
  };

  const handleImportFromCounter = (e) => {
    const counterId = e.target.value;
    if (!counterId) return;
    const selectedCounter = counters.find(c => c.id === counterId);
    if (selectedCounter) {
      setFormData(prev => ({
        ...prev,
        count: selectedCounter.value,
        notes: prev.notes ? `${prev.notes}\n[Contador "${selectedCounter.name}": ${selectedCounter.value}]` : `[Contador "${selectedCounter.name}": ${selectedCounter.value}]`
      }));
    }
  };

  // Capturar coordenadas GPS do dispositivo
  const handleGetCoordinates = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada por este dispositivo.');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        const accuracy = Math.round(pos.coords.accuracy);
        const coordString = `Lat: ${lat}, Lng: ${lng} (±${accuracy}m)`;

        setFormData(prev => ({
          ...prev,
          location: prev.location ? `${prev.location} | ${coordString}` : coordString
        }));
      },
      (err) => {
        setGeoLoading(false);
        alert('Não foi possível obter a localização: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.tombo.trim()) {
      alert('Por favor, informe o Número de Tombo / Catálogo.');
      return;
    }

    onSave({
      ...formData,
      id: initialData?.id || `sp-${Date.now()}`
    });
  };

  return (
    <div className="specimen-form-card">
      <div className="form-header">
        <div>
          <h3>{initialData?.id ? 'Editar Espécime' : 'Catalogar Novo Espécime'}</h3>
          <p className="form-subtitle">Preencha os dados taxonômicos e de coleta para a planilha</p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-close">
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="catalog-grid-form">
        {/* Bloco 1: Identificação e Tombo */}
        <div className="form-section-title">1. Identificação e Código do Espécime</div>

        <div className="form-row-highlight">
          <div className="form-group flex-2">
            <label>
              Número de Tombo / Catálogo *
              <span className="label-helper">(código impresso na etiqueta ou frasco)</span>
            </label>
            <div className="input-with-tools">
              <Hash size={18} className="input-icon" />
              <input
                type="text"
                name="tombo"
                required
                value={formData.tombo}
                onChange={handleChange}
                placeholder="Ex: BIO-2026-042"
              />
              {/* Scanner de Câmera */}
              <button
                type="button"
                onClick={onOpenScanner}
                className="btn-input-tool"
                title="Escanear número com a câmera"
              >
                <Camera size={18} className="text-emerald" />
                <span className="tool-btn-text">Câmera OCR</span>
              </button>

              {/* Ditado por Voz */}
              <VoiceInputButton
                onResult={handleVoiceTombo}
                mode="number"
                placeholderHint="Fale o número de tombo"
              />
            </div>
          </div>

          <div className="form-group flex-1">
            <label>Quantidade de Indivíduos</label>
            <div className="input-with-tools">
              <input
                type="number"
                name="count"
                min="1"
                value={formData.count}
                onChange={handleChange}
              />
              <VoiceInputButton
                onResult={handleVoiceCount}
                mode="number"
                placeholderHint="Fale a quantidade"
              />
            </div>
            {counters.length > 0 && (
              <select
                onChange={handleImportFromCounter}
                defaultValue=""
                className="select-import-counter"
                title="Importar contagem de um contador ativo"
              >
                <option value="" disabled>Puxar valor do Contador...</option>
                {counters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}: {c.value}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bloco 2: Taxonomia */}
        <div className="form-section-title">2. Classificação Taxonômica</div>

        <div className="form-row">
          <div className="form-group">
            <label>Ordem</label>
            <input
              type="text"
              name="order"
              value={formData.order}
              onChange={handleChange}
              placeholder="Ex: Hymenoptera, Coleoptera, Diptera"
            />
          </div>

          <div className="form-group">
            <label>Família</label>
            <input
              type="text"
              name="family"
              value={formData.family}
              onChange={handleChange}
              placeholder="Ex: Formicidae, Scarabaeidae"
            />
          </div>

          <div className="form-group">
            <label>Gênero</label>
            <input
              type="text"
              name="genus"
              value={formData.genus}
              onChange={handleChange}
              placeholder="Ex: Atta, Camponotus"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Espécie / Morfoespécie</label>
            <input
              type="text"
              name="species"
              value={formData.species}
              onChange={handleChange}
              placeholder="Ex: Atta sexdens, Morfotipo 03"
            />
          </div>

          <div className="form-group">
            <label>Nome Popular / Vulgar</label>
            <input
              type="text"
              name="popularName"
              value={formData.popularName}
              onChange={handleChange}
              placeholder="Ex: Formiga Saúva"
            />
          </div>
        </div>

        {/* Bloco 3: Amostragem e Coleta */}
        <div className="form-section-title">3. Dados de Coleta e Preservação</div>

        <div className="form-row">
          <div className="form-group">
            <label>Coletor(a)</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                name="collector"
                value={formData.collector}
                onChange={handleChange}
                placeholder="Ex: Dr. M. Johnsson"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Data da Coleta</label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Localidade / Coordenadas</label>
          <div className="input-with-tools">
            <MapPin size={18} className="input-icon" />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ex: Mata Atlântica, Trilha da Cachoeira, SP"
            />
            <button
              type="button"
              onClick={handleGetCoordinates}
              disabled={geoLoading}
              className="btn-input-tool"
              title="Obter GPS atual do dispositivo"
            >
              <Compass size={16} />
              <span className="tool-btn-text">{geoLoading ? 'Obtendo...' : 'GPS Atual'}</span>
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Preservação</label>
            <select
              name="preservation"
              value={formData.preservation}
              onChange={handleChange}
            >
              {PRESERVATION_TYPES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Estágio de Vida</label>
            <select
              name="stage"
              value={formData.stage}
              onChange={handleChange}
            >
              {LIFE_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sexo / Caste</label>
            <select
              name="sex"
              value={formData.sex}
              onChange={handleChange}
            >
              {SEX_TYPES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Observações Ecológicas / Notas de Campo</label>
          <textarea
            name="notes"
            rows="2"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ex: Coletado em tronco caído em decomposição, armadilha Winkler, etc."
          ></textarea>
        </div>

        <div className="form-actions-bar">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary btn-save-catalog">
            <Save size={18} />
            <span>{initialData?.id ? 'Salvar Modificações' : 'Registrar na Planilha'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
