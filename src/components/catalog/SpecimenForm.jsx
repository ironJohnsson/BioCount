import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  X,
  Hash,
  Calendar,
  User,
  Compass,
  AlertTriangle,
  FileEdit,
  Send,
  ShieldCheck,
  Plus,
  Trash2,
  ListPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logSystemActivity, updateMyAction } from '../collaboration/OnlineUsersPanel';

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

// Conjunto padrão de 20 variáveis biológicas frequentes em análises taxonômicas e morfológicas
export const DEFAULT_20_VARIABLES = [
  { id: 'v-1', name: 'Comprimento Total do Corpo', value: '' },
  { id: 'v-2', name: 'Largura Cefálica (Cabeça)', value: '' },
  { id: 'v-3', name: 'Comprimento da Asa / Élitro', value: '' },
  { id: 'v-4', name: 'Padrão de Coloração Geral', value: '' },
  { id: 'v-5', name: 'Pilosidade e Cerdas Corporais', value: '' },
  { id: 'v-6', name: 'Número de Segmentos Antenais', value: '' },
  { id: 'v-7', name: 'Morfologia Mandibular / Peças Bucais', value: '' },
  { id: 'v-8', name: 'Comprimento do Fêmur Posterior', value: '' },
  { id: 'v-9', name: 'Segmentação Abdominal (Urosternitos)', value: '' },
  { id: 'v-10', name: 'Morfologia Ocular e Ocelos', value: '' },
  { id: 'v-11', name: 'Estruturas Genitais Observáveis', value: '' },
  { id: 'v-12', name: 'Escultura / Suturas do Pronoto', value: '' },
  { id: 'v-13', name: 'Textura do Tegumento (Liso/Pontuado)', value: '' },
  { id: 'v-14', name: 'Brilho Cuticular (Opaco / Metálico)', value: '' },
  { id: 'v-15', name: 'Espinhos Tibiais e Garras Tarsais', value: '' },
  { id: 'v-16', name: 'Venação Alar (Células e Nervuras)', value: '' },
  { id: 'v-17', name: 'Manchas / Máculas Específicas', value: '' },
  { id: 'v-18', name: 'Morfologia do Clípeo / Escuto', value: '' },
  { id: 'v-19', name: 'Dimorfismo Sexual Observado', value: '' },
  { id: 'v-20', name: 'Integridade da Amostra / Danos / Parasitas', value: '' }
];

export default function SpecimenForm({
  initialData,
  existingSpecimens = [],
  onSave,
  onCancel,
  counters = []
}) {
  const { currentUser, canValidate } = useAuth();

  const [formData, setFormData] = useState({
    tombo: '',
    analystName: currentUser?.name || '',
    analystRole: currentUser?.role || 'aluno_treinamento',
    status: 'rascunho', // 'rascunho' | 'pendente_verificacao' | 'verificado'
    order: '',
    family: '',
    genus: '',
    species: '',
    popularName: '',
    count: 1,
    collector: currentUser?.name || '',
    date: new Date().toISOString().slice(0, 10),
    location: '',
    preservation: PRESERVATION_TYPES[0],
    stage: LIFE_STAGES[0],
    sex: SEX_TYPES[0],
    notes: '',
    variables: [
      { id: 'v-init-1', name: 'Comprimento Total', value: '' },
      { id: 'v-init-2', name: 'Coloração Mandibular', value: '' },
      { id: 'v-init-3', name: 'Pilosidade', value: '' }
    ]
  });

  const [geoLoading, setGeoLoading] = useState(false);

  // Inicializa dados na edição ou novo cadastro
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        variables: initialData.variables || prev.variables
      }));
    } else if (currentUser) {
      setFormData(prev => ({
        ...prev,
        analystName: prev.analystName || currentUser.name,
        analystRole: currentUser.role
      }));
    }
  }, [initialData, currentUser]);

  // Atualizar ação de presença quando estiver editando
  useEffect(() => {
    if (currentUser) {
      const code = formData.tombo || 'nova amostra';
      updateMyAction(currentUser, `Editando ficha [${code}]`);
    }
  }, [formData.tombo, currentUser]);

  // PROTEÇÃO CONTRA AMOSTRAS DUPLICADAS:
  // Checa em tempo real se o código de contagem já existe na planilha existente
  const duplicateMatch = useMemo(() => {
    const code = formData.tombo.trim().toUpperCase();
    if (!code) return null;
    return existingSpecimens.find(
      s => (s.tombo || s.countingCode || '').toUpperCase() === code && s.id !== initialData?.id
    );
  }, [formData.tombo, existingSpecimens, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'count' ? Math.max(1, parseInt(value, 10) || 1) : value
    }));
  };

  const handleImportFromCounter = (e) => {
    const counterId = e.target.value;
    if (!counterId) return;
    const selectedCounter = counters.find(c => c.id === counterId);
    if (selectedCounter) {
      setFormData(prev => ({
        ...prev,
        count: selectedCounter.value,
        notes: prev.notes
          ? `${prev.notes}\n[Contador "${selectedCounter.name}": ${selectedCounter.value}]`
          : `[Contador "${selectedCounter.name}": ${selectedCounter.value}]`
      }));
    }
  };

  // Gerenciamento de variáveis dinâmicas (~20 caixas de texto)
  const handleVariableChange = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.map(v => (v.id === id ? { ...v, [field]: value } : v))
    }));
  };

  const handleAddVariable = () => {
    const nextIdx = formData.variables.length + 1;
    const newVar = {
      id: `v-${Date.now()}-${nextIdx}`,
      name: `Variável ${nextIdx}`,
      value: ''
    };
    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, newVar]
    }));
  };

  const handleRemoveVariable = (id) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.id !== id)
    }));
  };

  // Carregar conjunto padrão de 20 variáveis
  const handleLoadDefault20Variables = () => {
    if (
      formData.variables.length > 3 &&
      !window.confirm('Substituir a lista atual pelas 20 variáveis taxonômicas padrão?')
    ) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      variables: DEFAULT_20_VARIABLES.map(v => ({ ...v, id: `v-${Date.now()}-${v.id}` }))
    }));
  };

  // Carregar dados de amostra duplicada existente para atualização
  const handleLoadDuplicateData = () => {
    if (!duplicateMatch) return;
    if (window.confirm(`Deseja carregar os dados cadastrados para o código "${duplicateMatch.tombo}"?`)) {
      setFormData({
        ...duplicateMatch,
        variables: duplicateMatch.variables || DEFAULT_20_VARIABLES
      });
    }
  };

  // Obter GPS do dispositivo
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

  // Processo de salvamento com suporte a:
  // 1. 'rascunho'
  // 2. 'pendente_verificacao' (Salvar e verificar para quem está em treinamento)
  // 3. 'verificado' (Validação direta para professores e validadores)
  const handlePerformSave = (targetStatus) => {
    if (!formData.tombo.trim()) {
      alert('Por favor, informe o Código da Contagem / Tombo.');
      return;
    }

    // Proteção contra duplicação de amostras
    if (duplicateMatch) {
      alert(
        `[Bloqueio de Duplicidade] O código "${formData.tombo}" já existe na planilha!\n\n` +
        `Cadastrado por: ${duplicateMatch.analystName || duplicateMatch.collector || 'Outro analista'}\n` +
        `Status atual: ${duplicateMatch.status}\n\n` +
        `Para atualizar a amostra existente, clique no botão "Carregar Dados Deste Código" no alerta acima, ou modifique o código da nova amostra.`
      );
      return;
    }

    const payload = {
      ...formData,
      tombo: formData.tombo.trim().toUpperCase(),
      countingCode: formData.tombo.trim().toUpperCase(),
      status: targetStatus,
      updatedAt: new Date().toISOString(),
      id: initialData?.id || `sp-${Date.now()}`
    };

    // Registrar no feed de atividades
    let actionDesc = 'Salvou rascunho';
    if (targetStatus === 'pendente_verificacao') {
      actionDesc = 'Submeteu para conferência e verificação';
    } else if (targetStatus === 'verificado') {
      actionDesc = 'Salvou diretamente como verificado';
    }

    logSystemActivity(
      currentUser?.name || formData.analystName,
      currentUser?.role || formData.analystRole,
      `${actionDesc} (${payload.variables?.length || 0} variáveis)`,
      payload.tombo
    );

    onSave(payload);
  };

  return (
    <div className="specimen-form-card">
      {/* Cabeçalho do Formulário */}
      <div className="form-header">
        <div>
          <div className="form-badge-line">
            <span className="badge-form-mode">
              {initialData?.id ? 'Modo Edição' : 'Novo Cadastro de Espécime'}
            </span>
            {formData.status && (
              <span className={`status-badge status-${formData.status}`}>
                Status: {formData.status === 'rascunho' ? 'Rascunho' : formData.status === 'pendente_verificacao' ? 'Pendente Verificação' : 'Verificado'}
              </span>
            )}
          </div>
          <h3>{initialData?.id ? `Espécime ${formData.tombo || initialData.tombo}` : 'Cadastro & Contagem de Espécime'}</h3>
          <p className="form-subtitle">
            Preencha a identificação, características contabilizadas (~20 caixas de texto) e dados taxonômicos
          </p>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-close">
            <X size={20} />
          </button>
        )}
      </div>

      {/* BLOCO DE ALERTA DE AMOSTRA DUPLICADA */}
      {duplicateMatch && (
        <div className="alert-duplicate-warning">
          <div className="alert-duplicate-content">
            <AlertTriangle size={24} className="text-danger" />
            <div>
              <strong>Alerta de Duplicidade na Planilha!</strong>
              <p>
                O código <code>{formData.tombo}</code> já se encontra cadastrado na planilha por{' '}
                <strong>{duplicateMatch.analystName || duplicateMatch.collector || 'outro usuário'}</strong>{' '}
                (Status: <em>{duplicateMatch.status}</em>).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadDuplicateData}
            className="btn-resolve-duplicate"
          >
            Carregar Dados Deste Código
          </button>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="catalog-grid-form">
        {/* Bloco 1: Identificação, Analista e Código Contagem */}
        <div className="form-section-title">
          1. Identificação da Análise, Código e Analista
        </div>

        <div className="form-row-highlight">
          {/* Nome da Pessoa que está analisando */}
          <div className="form-group flex-1">
            <label>
              Nome da Pessoa que está Analisando *
              <span className="label-helper">(responsável pela contagem / análise)</span>
            </label>
            <div className="input-with-icon">
              <User size={18} className="input-icon text-emerald" />
              <input
                type="text"
                name="analystName"
                required
                value={formData.analystName}
                onChange={handleChange}
                placeholder="Ex: Lucas Oliveira ou Prof. Ricardo"
              />
            </div>
          </div>

          {/* Código da Contagem com Detecção Anti-Duplicidade */}
          <div className="form-group flex-1">
            <label>
              Código Contagem / Tombo da Análise *
              <span className="label-helper">(código único na planilha)</span>
            </label>
            <div className={`input-with-icon ${duplicateMatch ? 'input-error-border' : ''}`}>
              <Hash size={18} className="input-icon" />
              <input
                type="text"
                name="tombo"
                required
                value={formData.tombo}
                onChange={handleChange}
                placeholder="Ex: COD-2026-042 ou BIO-001"
              />
            </div>
          </div>

          {/* Quantidade de Indivíduos */}
          <div className="form-group flex-1">
            <label>Quantidade Contada</label>
            <input
              type="number"
              name="count"
              min="1"
              value={formData.count}
              onChange={handleChange}
            />
            {counters.length > 0 && (
              <select
                onChange={handleImportFromCounter}
                defaultValue=""
                className="select-import-counter"
                title="Importar contagem de um contador ativo"
              >
                <option value="" disabled>Importar do Contador...</option>
                {counters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}: {c.value}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bloco 2: Variáveis Contabilizando (Até 20+ caixas de texto para dados específicos) */}
        <div className="form-section-title section-title-with-actions">
          <div>
            <span>2. Variáveis Contabilizando & Características Específicas</span>
            <span className="badge-vars-count">
              {formData.variables.length} variáveis ativas (suporta até 20+)
            </span>
          </div>
          <div className="section-actions-right">
            <button
              type="button"
              onClick={handleLoadDefault20Variables}
              className="btn-template-preset"
              title="Carregar pacote completo de 20 variáveis taxonômicas e morfológicas padrão"
            >
              <ListPlus size={15} /> Preencher 20 Variáveis Padrão
            </button>
            <button
              type="button"
              onClick={handleAddVariable}
              className="btn-add-var"
              title="Adicionar nova caixa de texto para característica"
            >
              <Plus size={15} /> Adicionar Variável
            </button>
          </div>
        </div>

        <p className="section-instruction-text">
          Insira dados específicos como características morfológicas, medições, colorações, contagens parciais
          ou anotações da análise. Cada variável possui uma caixa de texto dedicada.
        </p>

        <div className="variables-dynamic-container">
          {formData.variables.map((variable, index) => (
            <div key={variable.id} className="variable-card-row">
              <div className="variable-index-badge">#{index + 1}</div>
              <div className="variable-fields">
                <div className="variable-name-col">
                  <label className="variable-field-label">Nome da Variável / Característica:</label>
                  <input
                    type="text"
                    className="input-var-name"
                    value={variable.name}
                    onChange={(e) => handleVariableChange(variable.id, 'name', e.target.value)}
                    placeholder="Ex: Comprimento da Asa"
                  />
                </div>
                <div className="variable-value-col">
                  <label className="variable-field-label">Dados Específicos / Anotação (Caixa de Texto):</label>
                  <textarea
                    rows="2"
                    className="textarea-var-value"
                    value={variable.value}
                    onChange={(e) => handleVariableChange(variable.id, 'value', e.target.value)}
                    placeholder="Descreva medições, estados de caráter, coloração ou observações desta variável..."
                  ></textarea>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveVariable(variable.id)}
                className="btn-remove-var"
                title="Excluir esta variável"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <div className="add-more-vars-prompt">
            <button
              type="button"
              onClick={handleAddVariable}
              className="btn-outline-dashed"
            >
              <Plus size={16} /> Adicionar Mais uma Variável (+1)
            </button>
          </div>
        </div>

        {/* Bloco 3: Taxonomia */}
        <div className="form-section-title">3. Classificação Taxonômica</div>

        <div className="form-row">
          <div className="form-group">
            <label>Ordem</label>
            <input
              type="text"
              name="order"
              value={formData.order}
              onChange={handleChange}
              placeholder="Ex: Hymenoptera, Coleoptera"
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

        {/* Bloco 4: Dados de Coleta e Preservação */}
        <div className="form-section-title">4. Dados de Coleta e Preservação</div>

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
            <label>Sexo / Casta</label>
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
            placeholder="Ex: Amostra coletada em tronco caído, armadilha pitfall, etc."
          ></textarea>
        </div>

        {/* BARRA DE AÇÕES: SALVAR RASCUNHO, SALVAR E VERIFICAR, VERIFICAR DIRETO */}
        <div className="form-actions-bar advanced-actions-bar">
          <div className="left-cancel-col">
            {onCancel && (
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancelar
              </button>
            )}
          </div>

          <div className="right-save-options">
            {/* Opção 1: Salvar Rascunho */}
            <button
              type="button"
              onClick={() => handlePerformSave('rascunho')}
              className="btn-action-draft"
              title="Salvar como rascunho na planilha para continuar depois"
            >
              <FileEdit size={17} />
              <span>Salvar Rascunho</span>
            </button>

            {/* Opção 2: Salvar e Submeter para Verificação (indispensável para quem está em treinamento) */}
            <button
              type="button"
              onClick={() => handlePerformSave('pendente_verificacao')}
              className="btn-action-submit-verify"
              title="Salvar e submeter à fila de conferência dos validadores e professores"
            >
              <Send size={17} />
              <span>Salvar e Verificar</span>
            </button>

            {/* Opção 3: Validar e Salvar Direto (Apenas Validadores e Professores) */}
            {canValidate() && (
              <button
                type="button"
                onClick={() => handlePerformSave('verificado')}
                className="btn-primary btn-save-verified"
                title="Salvar com status verificado diretamente (exclusivo para quem possui treinamento finalizado)"
              >
                <ShieldCheck size={18} />
                <span>Salvar & Aprovar</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
