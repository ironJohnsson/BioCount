import React, { useState } from 'react';
import { AlertTriangle, GitMerge, RefreshCw, PlusCircle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ConflictResolutionModal({
  isOpen,
  conflictData,
  onClose,
  onResolve
}) {
  const [resolutionMode, setResolutionMode] = useState('merge'); // 'merge' | 'replace' | 'new_code'
  const [customNewCode, setCustomNewCode] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !conflictData) return null;

  const { officialSpecimen, repositorySpecimen } = conflictData;
  const currentCode = officialSpecimen?.countingCode || repositorySpecimen?.countingCode || 'AM-001';
  const defaultDerivedCode = customNewCode || `${currentCode}-REV1`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onResolve(resolutionMode, {
        officialId: officialSpecimen.id,
        repositoryId: repositorySpecimen.id,
        resolution: resolutionMode,
        newCode: resolutionMode === 'new_code' ? defaultDerivedCode.trim() : null,
        verificationNotes: auditNotes.trim()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-conflict-card">
        <div className="modal-header header-conflict">
          <div className="conflict-badge-row">
            <span className="badge-conflict-alert">
              <ShieldAlert size={16} /> Proteção Anti-Sobrescrita Ativada
            </span>
            <span className="badge-code">{currentCode}</span>
          </div>
          <h3>Conflito de Concorrência na Planilha Oficial</h3>
          <p className="modal-subtitle">
            O espécime com código <strong>{currentCode}</strong> já consta na Planilha Oficial. Escolha como integrar os dados sem risco de apagar o trabalho de outro pesquisador.
          </p>
          <button type="button" onClick={onClose} className="btn-close" title="Cancelar">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-content conflict-modal-body">
          {/* Alerta explicativo */}
          <div className="alert-box alert-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Prevenção de Perda de Dados em Tempo Real</strong>
              <p>
                Outro integrante do laboratório já registrou dados oficiais para este mesmo código. O sistema isolou a submissão no Repositório para que você decida como proceder.
              </p>
            </div>
          </div>

          {/* Comparação Lado a Lado (Diff) */}
          <div className="diff-comparison-grid">
            {/* Lado Esquerdo: Versão Atual na Planilha Oficial */}
            <div className="diff-col diff-official">
              <div className="diff-col-header">
                <CheckCircle2 size={16} className="text-emerald" />
                <h4>Versão Atual na Planilha Oficial</h4>
              </div>
              <div className="diff-card-content">
                <div className="diff-field">
                  <span className="diff-label">Código:</span>
                  <strong>{officialSpecimen?.countingCode}</strong>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Analista Original:</span>
                  <span>{officialSpecimen?.analystName || 'Não inf.'}</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Táxon:</span>
                  <span>{[officialSpecimen?.genus, officialSpecimen?.species].filter(Boolean).join(' ') || 'Não identificado'}</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Quantidade:</span>
                  <span>{officialSpecimen?.count} indivíduo(s)</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Variáveis ({officialSpecimen?.variables?.length || 0}):</span>
                  <div className="diff-vars-preview">
                    {(officialSpecimen?.variables || []).slice(0, 4).map((v, i) => (
                      <span key={i} className="mini-var-chip">{v.name}: {v.value || '—'}</span>
                    ))}
                    {(officialSpecimen?.variables?.length || 0) > 4 && (
                      <span className="mini-var-chip text-muted">+{officialSpecimen.variables.length - 4} mais</span>
                    )}
                  </div>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Validado por:</span>
                  <span className="text-emerald">{officialSpecimen?.verifiedBy || 'Consolidado'} ({officialSpecimen?.verifiedAt || 'Oficial'})</span>
                </div>
                {officialSpecimen?.notes && (
                  <div className="diff-field">
                    <span className="diff-label">Notas:</span>
                    <p className="diff-notes">{officialSpecimen.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Nova Submissão Aprovada do Repositório */}
            <div className="diff-col diff-repository">
              <div className="diff-col-header">
                <GitMerge size={16} className="text-accent" />
                <h4>Nova Submissão Aprovada (Repositório)</h4>
              </div>
              <div className="diff-card-content">
                <div className="diff-field">
                  <span className="diff-label">Código:</span>
                  <strong>{repositorySpecimen?.countingCode}</strong>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Analista da Submissão:</span>
                  <span>{repositorySpecimen?.analystName || 'Não inf.'}</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Táxon:</span>
                  <span>{[repositorySpecimen?.genus, repositorySpecimen?.species].filter(Boolean).join(' ') || 'Não identificado'}</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Quantidade:</span>
                  <span>{repositorySpecimen?.count} indivíduo(s)</span>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Variáveis ({repositorySpecimen?.variables?.length || 0}):</span>
                  <div className="diff-vars-preview">
                    {(repositorySpecimen?.variables || []).slice(0, 4).map((v, i) => (
                      <span key={i} className="mini-var-chip accent">{v.name}: {v.value || '—'}</span>
                    ))}
                    {(repositorySpecimen?.variables?.length || 0) > 4 && (
                      <span className="mini-var-chip text-muted">+{repositorySpecimen.variables.length - 4} mais</span>
                    )}
                  </div>
                </div>
                <div className="diff-field">
                  <span className="diff-label">Status da Submissão:</span>
                  <span className="text-amber">Aprovada • Aguardando Integração</span>
                </div>
                {repositorySpecimen?.notes && (
                  <div className="diff-field">
                    <span className="diff-label">Notas do Repositório:</span>
                    <p className="diff-notes">{repositorySpecimen.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Opções de Resolução */}
          <form onSubmit={handleSubmit} className="conflict-options-form">
            <h4 className="options-title">Escolha a Ação de Resolução:</h4>

            <div className="resolution-radios">
              {/* Opção 1: Mesclar (Recomendado) */}
              <label className={`resolution-card ${resolutionMode === 'merge' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="resolutionMode"
                  value="merge"
                  checked={resolutionMode === 'merge'}
                  onChange={() => setResolutionMode('merge')}
                />
                <div className="resolution-card-body">
                  <div className="resolution-title-row">
                    <GitMerge size={18} className="text-emerald" />
                    <strong>Mesclar Informações (Recomendado)</strong>
                    <span className="badge-recommend">Seguro</span>
                  </div>
                  <p>
                    Mantém os dados existentes na Planilha Oficial e soma as novas características/variáveis da submissão. Ambas as contribuições são preservadas.
                  </p>
                </div>
              </label>

              {/* Opção 2: Substituir */}
              <label className={`resolution-card ${resolutionMode === 'replace' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="resolutionMode"
                  value="replace"
                  checked={resolutionMode === 'replace'}
                  onChange={() => setResolutionMode('replace')}
                />
                <div className="resolution-card-body">
                  <div className="resolution-title-row">
                    <RefreshCw size={18} className="text-amber" />
                    <strong>Substituir Registro Oficial</strong>
                  </div>
                  <p>
                    Atualiza os dados da Planilha Oficial com os dados mais recentes auditados nesta submissão, registrando o carimbo do auditor.
                  </p>
                </div>
              </label>

              {/* Opção 3: Derivar novo código */}
              <label className={`resolution-card ${resolutionMode === 'new_code' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="resolutionMode"
                  value="new_code"
                  checked={resolutionMode === 'new_code'}
                  onChange={() => setResolutionMode('new_code')}
                />
                <div className="resolution-card-body">
                  <div className="resolution-title-row">
                    <PlusCircle size={18} className="text-accent" />
                    <strong>Criar Novo Código de Tombo / Sub-amostra</strong>
                  </div>
                  <p>
                    Mantém o registro original intacto e adiciona a nova amostra com um novo código derivado na Planilha Oficial.
                  </p>
                  {resolutionMode === 'new_code' && (
                    <div className="new-code-input-box" onClick={(e) => e.stopPropagation()}>
                      <label>Novo Código de Tombo para a Amostra:</label>
                      <input
                        type="text"
                        value={customNewCode}
                        onChange={(e) => setCustomNewCode(e.target.value.toUpperCase())}
                        placeholder={defaultDerivedCode}
                        required
                      />
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Parecer do Auditor no Conflito */}
            <div className="form-group mt-3">
              <label>Justificativa / Parecer do Auditor para a Resolução:</label>
              <textarea
                rows="2"
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                placeholder="Ex: Mescladas características morfológicas após conferência com lâmina histológica..."
              />
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Processando Resolução...' : 'Confirmar Resolução & Integrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

