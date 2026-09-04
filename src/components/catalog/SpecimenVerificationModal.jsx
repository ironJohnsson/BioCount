import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ShieldCheck, X, FileText, UserCheck, Calendar, Sparkles } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { logSystemActivity, updateMyAction } from '../collaboration/OnlineUsersPanel';

export default function SpecimenVerificationModal({
  specimen,
  isOpen,
  onClose,
  onSaveVerification
}) {
  const { currentUser, canValidate } = useAuth();

  const [verificationNotes, setVerificationNotes] = useState(specimen?.verificationNotes || '');
  const [checklist, setChecklist] = useState({
    codeMatches: true,
    countMatches: true,
    morphologyConfirmed: true,
    variablesChecked: true
  });
  const [decision, setDecision] = useState('aprovado'); // 'aprovado' | 'revisao'

  if (!isOpen || !specimen) return null;

  const handleCheckboxChange = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();

    if (!canValidate()) {
      alert('Acesso negado: Apenas alunos com treinamento finalizado ou professores têm autorização para validar amostras.');
      return;
    }

    const isApproved = decision === 'aprovado';
    const updatedSpecimen = {
      ...specimen,
      status: isApproved ? 'verificado' : 'pendente_verificacao',
      verifiedBy: currentUser.name,
      verifiedById: currentUser.id,
      verifiedAt: new Date().toLocaleString('pt-BR'),
      verificationNotes: verificationNotes.trim(),
      verificationChecklist: checklist
    };

    logSystemActivity(
      currentUser.name,
      currentUser.role,
      isApproved ? 'Validou e aprovou a amostra' : 'Solicitou ajustes na amostra',
      specimen.tombo || specimen.countingCode
    );

    updateMyAction(currentUser, `Validou espécime ${specimen.tombo || specimen.countingCode}`);

    onSaveVerification(updatedSpecimen);
    onClose();
  };

  const isTraineeBlocked = !canValidate();

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-verification-card">
        <div className="modal-header">
          <div className="header-badge-row">
            <span className="badge-audit">
              <ShieldCheck size={16} /> Auditoria & Validação de Amostra
            </span>
            <span className="badge-code">{specimen.tombo || specimen.countingCode}</span>
          </div>
          <h3>Conferência de Espécime</h3>
          <p className="modal-subtitle">
            A informação é recuperada da planilha para auditoria e adição de novos dados de validação
          </p>
          <button type="button" onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body-content verification-body">
          {/* Alerta de bloqueio caso seja Aluno em Treinamento */}
          {isTraineeBlocked && (
            <div className="alert-box alert-danger">
              <AlertTriangle size={20} />
              <div>
                <strong>Acesso Restrito ao Treinamento</strong>
                <p>
                  Sua conta está no nível <em>Aluno em Treinamento</em>. Você pode visualizar os dados da planilha, mas
                  apenas alunos com treinamento concluído ou professores podem assinar e validar a amostra.
                </p>
              </div>
            </div>
          )}

          {/* PAINEL 1: Informações retiradas da planilha */}
          <div className="verification-section">
            <div className="section-header-banner">
              <FileText size={16} />
              <h4>1. Informações Retiradas da Planilha</h4>
            </div>

            <div className="verification-info-grid">
              <div className="info-cell">
                <span className="cell-label">Código da Contagem:</span>
                <strong className="cell-value">{specimen.tombo || specimen.countingCode}</strong>
              </div>
              <div className="info-cell">
                <span className="cell-label">Analisado por:</span>
                <strong className="cell-value">{specimen.analystName || specimen.collector || 'Não informado'}</strong>
              </div>
              <div className="info-cell">
                <span className="cell-label">Qtd. Contada:</span>
                <strong className="cell-value">{specimen.count} indivíduo(s)</strong>
              </div>
              <div className="info-cell">
                <span className="cell-label">Classificação Taxonômica:</span>
                <strong className="cell-value">
                  {[specimen.genus, specimen.species].filter(Boolean).join(' ') || specimen.family || specimen.order || 'Não identificado'}
                </strong>
              </div>
              <div className="info-cell">
                <span className="cell-label">Preservação / Estágio:</span>
                <span className="cell-value">{specimen.preservation} • {specimen.stage} • {specimen.sex}</span>
              </div>
              <div className="info-cell">
                <span className="cell-label">Local de Coleta:</span>
                <span className="cell-value">{specimen.location || 'Não informado'}</span>
              </div>
            </div>

            {/* Variáveis Contabilizadas pela pessoa que analisou */}
            {specimen.variables && specimen.variables.length > 0 && (
              <div className="variables-audit-block">
                <h5 className="sub-section-title">
                  Variáveis & Características Contabilizadas ({specimen.variables.length}):
                </h5>
                <div className="variables-audit-grid">
                  {specimen.variables.map((v, idx) => (
                    <div key={v.id || idx} className="variable-audit-item">
                      <span className="var-name">#{idx + 1} {v.name}:</span>
                      <span className="var-value">{v.value || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {specimen.notes && (
              <div className="notes-audit-block">
                <span className="cell-label">Notas Originais de Campo:</span>
                <p className="original-notes-text">{specimen.notes}</p>
              </div>
            )}
          </div>

          {/* PAINEL 2: Novas informações acrescentadas pelo validador */}
          <div className="verification-section new-data-section">
            <div className="section-header-banner banner-accent">
              <Sparkles size={16} />
              <h4>2. Acrescentar Novas Informações de Verificação</h4>
            </div>

            <form onSubmit={handleConfirm}>
              {/* Quem está validando */}
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Validador Responsável</label>
                  <div className="input-with-icon">
                    <UserCheck size={16} className="input-icon text-emerald" />
                    <input
                      type="text"
                      readOnly
                      value={`${currentUser?.name} (${ROLE_LABELS[currentUser?.role]?.short})`}
                      className="input-readonly"
                    />
                  </div>
                </div>

                <div className="form-group flex-1">
                  <label>Data / Hora da Conferência</label>
                  <div className="input-with-icon">
                    <Calendar size={16} className="input-icon" />
                    <input
                      type="text"
                      readOnly
                      value={new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      className="input-readonly"
                    />
                  </div>
                </div>
              </div>

              {/* Checklist de Conferência */}
              <div className="verification-checklist-group">
                <label className="checklist-group-title">Checklist de Auditoria Científica:</label>
                <div className="checklist-items">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checklist.codeMatches}
                      onChange={() => handleCheckboxChange('codeMatches')}
                      disabled={isTraineeBlocked}
                    />
                    <span>Código da etiqueta/amostra confere com o físico</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checklist.countMatches}
                      onChange={() => handleCheckboxChange('countMatches')}
                      disabled={isTraineeBlocked}
                    />
                    <span>Quantidade de indivíduos confirmada</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checklist.morphologyConfirmed}
                      onChange={() => handleCheckboxChange('morphologyConfirmed')}
                      disabled={isTraineeBlocked}
                    />
                    <span>Identificação taxonômica validada</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checklist.variablesChecked}
                      onChange={() => handleCheckboxChange('variablesChecked')}
                      disabled={isTraineeBlocked}
                    />
                    <span>Variáveis e características específicas revisadas</span>
                  </label>
                </div>
              </div>

              {/* Novas Informações & Observações da Validação */}
              <div className="form-group">
                <label>
                  Novas Informações e Parecer da Verificação *
                  <span className="label-helper">
                    (adicione detalhes técnicos, correções ou observações morfológicas adicionais)
                  </span>
                </label>
                <textarea
                  rows="3"
                  required
                  disabled={isTraineeBlocked}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Ex: Características morfológicas confirmadas ao microscópio estereoscópico. Número de segmentos antenais e pilosidade compatíveis com o táxon. Amostra aprovada para tombamento oficial."
                ></textarea>
              </div>

              {/* Decisão */}
              <div className="decision-selector">
                <label className="radio-decision">
                  <input
                    type="radio"
                    name="decision"
                    value="aprovado"
                    checked={decision === 'aprovado'}
                    onChange={() => setDecision('aprovado')}
                    disabled={isTraineeBlocked}
                  />
                  <div className="radio-box box-approve">
                    <CheckCircle size={18} />
                    <div>
                      <strong>Aprovar e Marcar como Verificado</strong>
                      <span>A amostra entra como confirmada na planilha oficial</span>
                    </div>
                  </div>
                </label>

                <label className="radio-decision">
                  <input
                    type="radio"
                    name="decision"
                    value="revisao"
                    checked={decision === 'revisao'}
                    onChange={() => setDecision('revisao')}
                    disabled={isTraineeBlocked}
                  />
                  <div className="radio-box box-revisao">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Solicitar Correção / Retornar ao Aluno</strong>
                      <span>A amostra permanece pendente com suas novas observações anexadas</span>
                    </div>
                  </div>
                </label>
              </div>

              <div className="modal-footer-actions">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isTraineeBlocked}
                  className="btn-primary btn-confirm-verification"
                >
                  <ShieldCheck size={18} />
                  <span>Salvar Novas Informações & Finalizar Verificação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
