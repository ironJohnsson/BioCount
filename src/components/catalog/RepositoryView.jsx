import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Plus,
  Clock,
  FileEdit,
  ShieldCheck,
  Search,
  User,
  Edit,
  Trash2,
  Radio,
  Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SpecimenVerificationModal from './SpecimenVerificationModal';

export default function RepositoryView({
  specimens,
  onAddNew,
  onEditSpecimen,
  onDeleteSpecimen,
  onPromoteSpecimen,
  isCloudConnected = true
}) {
  const { currentUser, canValidate } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'pendente_verificacao' | 'rascunho' | 'meus'
  const [detailSpecimen, setDetailSpecimen] = useState(null);
  const [verifyingSpecimen, setVerifyingSpecimen] = useState(null);

  // Filtro composto
  const filteredSpecimens = useMemo(() => {
    return specimens.filter(s => {
      let matchStatus = true;
      if (selectedStatus === 'pendente_verificacao') {
        matchStatus = s.status === 'pendente_verificacao';
      } else if (selectedStatus === 'rascunho') {
        matchStatus = s.status === 'rascunho';
      } else if (selectedStatus === 'meus') {
        matchStatus = s.analystName?.toLowerCase() === currentUser?.name?.toLowerCase();
      }

      const term = searchTerm.toLowerCase();
      const code = (s.tombo || s.countingCode || '').toLowerCase();
      const matchTerm =
        !searchTerm ||
        code.includes(term) ||
        (s.species && s.species.toLowerCase().includes(term)) ||
        (s.genus && s.genus.toLowerCase().includes(term)) ||
        (s.family && s.family.toLowerCase().includes(term)) ||
        (s.analystName && s.analystName.toLowerCase().includes(term));

      return matchStatus && matchTerm;
    });
  }, [specimens, searchTerm, selectedStatus, currentUser]);

  const counts = useMemo(() => {
    return {
      all: specimens.length,
      pending: specimens.filter(s => s.status === 'pendente_verificacao').length,
      drafts: specimens.filter(s => s.status === 'rascunho').length,
      mine: specimens.filter(s => s.analystName?.toLowerCase() === currentUser?.name?.toLowerCase()).length
    };
  }, [specimens, currentUser]);

  const handleStartVerify = (sp) => {
    setVerifyingSpecimen(sp);
  };

  const handleSaveVerification = (updated) => {
    if (onPromoteSpecimen) {
      onPromoteSpecimen(updated);
    }
  };

  return (
    <div className="repository-view-wrapper">
      {/* Banner Informativo do Repositório de Entrada */}
      <div className="repo-info-banner">
        <div className="repo-banner-icon">
          <Inbox size={24} className="text-emerald" />
        </div>
        <div className="repo-banner-text">
          <div className="repo-banner-title-row">
            <h4>Repositório de Entrada & Quarentena (Staging)</h4>
            <span className="live-cloud-tag">
              <Radio size={12} className="pulse-icon text-emerald" />
              {isCloudConnected ? 'Sincronizado na Nuvem (Turso)' : 'Modo Offline Ativo'}
            </span>
          </div>
          <p>
            As amostras e rascunhos salvos nesta área ficam em quarentena isolada. Elas <strong>não alteram nem bloqueiam</strong> a Planilha Oficial da Coleção até que sejam auditadas e aprovadas por um Verificador ou Professor.
          </p>
        </div>
      </div>

      {/* Barra de Ações e Métricas do Repositório */}
      <div className="table-top-bar">
        <div className="table-stats">
          <span className="badge-stat">
            <strong>{specimens.length}</strong> Amostras em Quarentena
          </span>
          <span className="badge-stat stat-pending">
            <Clock size={14} />
            <strong>{counts.pending}</strong> Aguardando Validação
          </span>
        </div>

        <div className="table-actions">
          <button onClick={onAddNew} className="btn-primary">
            <Plus size={18} />
            <span>Novo Rascunho / Amostra</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Status */}
      <div className="status-filter-pills-bar">
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className={`status-pill-btn ${selectedStatus === 'ALL' ? 'active' : ''}`}
        >
          Todos em Quarentena ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('pendente_verificacao')}
          className={`status-pill-btn pill-pending ${selectedStatus === 'pendente_verificacao' ? 'active' : ''}`}
        >
          <Clock size={14} />
          <span>Aguardando Validação</span>
          <span className="pill-count">{counts.pending}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('rascunho')}
          className={`status-pill-btn pill-draft ${selectedStatus === 'rascunho' ? 'active' : ''}`}
        >
          <FileEdit size={14} />
          <span>Rascunhos</span>
          <span className="pill-count">{counts.drafts}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('meus')}
          className={`status-pill-btn ${selectedStatus === 'meus' ? 'active' : ''}`}
        >
          <User size={14} />
          <span>Cadastrados por Mim ({counts.mine})</span>
        </button>
      </div>

      {/* Busca Textual */}
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Código de Tombo, Analista, Espécie..."
          />
        </div>
      </div>

      {/* Lista de Registros do Repositório */}
      {specimens.length === 0 ? (
        <div className="empty-table-state empty-spreadsheet-initial">
          <Inbox size={48} className="text-emerald" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.8 }} />
          <h3>Repositório de Entrada Vazio</h3>
          <p>
            Nenhuma amostra em quarentena ou rascunho pendente no momento. Todos os espécimes aprovados estão seguros na Planilha Oficial.
          </p>
          <button onClick={onAddNew} className="btn-primary mt-3" style={{ margin: '1rem auto 0' }}>
            <Plus size={16} /> Cadastrar Nova Amostra no Repositório
          </button>
        </div>
      ) : filteredSpecimens.length === 0 ? (
        <div className="empty-table-state">
          <p>Nenhuma amostra no repositório corresponde aos filtros selecionados.</p>
        </div>
      ) : (
        <div className="responsive-table-container">
          <table className="specimens-table repo-table">
            <thead>
              <tr>
                <th>Código Contagem</th>
                <th>Status na Quarentena</th>
                <th>Cadastrado por</th>
                <th>Táxon / Morfotipo</th>
                <th>Qtd.</th>
                <th>Variáveis</th>
                <th className="th-actions">Ações de Triagem</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecimens.map((sp) => {
                const code = sp.tombo || sp.countingCode;
                const isPending = sp.status === 'pendente_verificacao';
                const varsCount = sp.variables?.length || 0;

                return (
                  <tr key={sp.id} className={isPending ? 'tr-pending-audit' : ''}>
                    {/* Código */}
                    <td className="td-tombo">
                      <span className="tombo-badge">{code}</span>
                    </td>

                    {/* Status */}
                    <td>
                      {isPending ? (
                        <span className="badge-status-table badge-status-pending" title="Aguardando validação">
                          <Clock size={13} /> Aguardando Auditoria
                        </span>
                      ) : (
                        <span className="badge-status-table badge-status-draft" title="Rascunho em edição">
                          <FileEdit size={13} /> Rascunho
                        </span>
                      )}
                    </td>

                    {/* Autor */}
                    <td>
                      <div className="analyst-cell">
                        <User size={14} className="text-muted" />
                        <span className="analyst-name">{sp.analystName || 'Não inf.'}</span>
                      </div>
                    </td>

                    {/* Táxon */}
                    <td>
                      <div className="taxon-cell">
                        <strong className="species-name">
                          {[sp.genus, sp.species].filter(Boolean).join(' ') || sp.species || sp.genus || 'Não identificado'}
                        </strong>
                        <small className="family-order-text">
                          {[sp.order, sp.family].filter(Boolean).join(' • ') || '—'}
                        </small>
                      </div>
                    </td>

                    {/* Quantidade */}
                    <td className="td-count">
                      <span className="count-pill">{sp.count}</span>
                    </td>

                    {/* Variáveis */}
                    <td>
                      <span className="badge-vars-pill">
                        {varsCount} vars
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="td-actions">
                      {/* Botão de Auditar & Promover */}
                      <button
                        type="button"
                        onClick={() => handleStartVerify(sp)}
                        className="btn-action-icon btn-action-verify"
                        title={canValidate() ? 'Auditar e Promover para Planilha Oficial' : 'Visualizar auditoria (requer nível Verificador/Professor)'}
                      >
                        <ShieldCheck size={16} />
                      </button>

                      {/* Ver Detalhes */}
                      <button
                        type="button"
                        onClick={() => setDetailSpecimen(sp)}
                        className="btn-action-icon"
                        title="Ver dados completos"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Editar Rascunho */}
                      <button
                        type="button"
                        onClick={() => onEditSpecimen(sp)}
                        className="btn-action-icon text-accent"
                        title="Editar rascunho no repositório"
                      >
                        <Edit size={16} />
                      </button>

                      {/* Excluir do Repositório */}
                      <button
                        type="button"
                        onClick={() => onDeleteSpecimen(sp.id)}
                        className="btn-action-icon btn-delete"
                        title="Descartar do repositório"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalhes da Ficha em Quarentena */}
      {detailSpecimen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-detail-card">
            <div className="modal-header">
              <div>
                <span className="status-badge status-pending">Em Quarentena no Repositório</span>
                <h3>{detailSpecimen.tombo || detailSpecimen.countingCode}</h3>
                <p className="modal-subtitle">{detailSpecimen.species || 'Ficha em Triagem'}</p>
              </div>
              <button onClick={() => setDetailSpecimen(null)} className="btn-close">✕</button>
            </div>

            <div className="detail-grid">
              <div className="detail-item"><strong>Analista Responsável:</strong> {detailSpecimen.analystName || '—'}</div>
              <div className="detail-item"><strong>Quantidade:</strong> {detailSpecimen.count} indivíduo(s)</div>
              <div className="detail-item"><strong>Ordem:</strong> {detailSpecimen.order || '—'}</div>
              <div className="detail-item"><strong>Família:</strong> {detailSpecimen.family || '—'}</div>
              <div className="detail-item"><strong>Gênero:</strong> {detailSpecimen.genus || '—'}</div>
              <div className="detail-item"><strong>Espécie / Morfotipo:</strong> {detailSpecimen.species || '—'}</div>
              <div className="detail-item full-width"><strong>Localidade:</strong> {detailSpecimen.location || '—'}</div>

              {detailSpecimen.variables && detailSpecimen.variables.length > 0 && (
                <div className="detail-item full-width">
                  <strong>Variáveis Contabilizadas ({detailSpecimen.variables.length}):</strong>
                  <div className="detail-vars-grid">
                    {detailSpecimen.variables.map((v, i) => (
                      <div key={v.id || i} className="detail-var-chip">
                        <span className="var-chip-label">#{i + 1} {v.name}:</span>
                        <span className="var-chip-val">{v.value || '(Vazio)'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setDetailSpecimen(null)} className="btn-secondary">
                Fechar
              </button>
              <button
                onClick={() => {
                  const sp = detailSpecimen;
                  setDetailSpecimen(null);
                  handleStartVerify(sp);
                }}
                className="btn-action-verify"
              >
                <ShieldCheck size={16} />
                <span>Auditar & Promover</span>
              </button>
              <button
                onClick={() => {
                  const sp = detailSpecimen;
                  setDetailSpecimen(null);
                  onEditSpecimen(sp);
                }}
                className="btn-primary"
              >
                Editar Rascunho
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoria e Promoção para Planilha Oficial */}
      {verifyingSpecimen && (
        <SpecimenVerificationModal
          specimen={verifyingSpecimen}
          isOpen={Boolean(verifyingSpecimen)}
          onClose={() => setVerifyingSpecimen(null)}
          onSaveVerification={handleSaveVerification}
        />
      )}
    </div>
  );
}
