import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  Eye,
  ShieldCheck,
  Clock,
  CheckCircle2,
  FileEdit,
  User,
  Upload,
  Radio,
  X
} from 'lucide-react';
import { exportSpecimensToCsv, parseCsvToSpecimens } from '../../utils/exportCsv';
import { useAuth } from '../../context/AuthContext';
import SpecimenVerificationModal from './SpecimenVerificationModal';

export default function SpecimenTable({
  specimens,
  onEditSpecimen,
  onDeleteSpecimen,
  onAddNew,
  onUpdateSpecimen,
  onImportSpecimens
}) {
  const { canValidate } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // 'ALL' | 'pendente_verificacao' | 'rascunho' | 'verificado'
  const [detailSpecimen, setDetailSpecimen] = useState(null);
  const [verifyingSpecimen, setVerifyingSpecimen] = useState(null);

  // Ordens únicas para filtro
  const orders = useMemo(() => {
    const list = new Set(specimens.map(s => s.order).filter(Boolean));
    return ['ALL', ...Array.from(list)];
  }, [specimens]);

  // Contagens por status
  const statusCounts = useMemo(() => {
    return {
      all: specimens.length,
      pendente: specimens.filter(s => s.status === 'pendente_verificacao').length,
      rascunho: specimens.filter(s => s.status === 'rascunho').length,
      verificado: specimens.filter(s => s.status === 'verificado').length
    };
  }, [specimens]);

  // Filtro composto (busca textual + ordem taxonômica + status)
  const filteredSpecimens = useMemo(() => {
    return specimens.filter(s => {
      const matchOrder = selectedOrder === 'ALL' || s.order === selectedOrder;

      let matchStatus = true;
      if (selectedStatus !== 'ALL') {
        matchStatus = s.status === selectedStatus;
      }

      const term = searchTerm.toLowerCase();
      const code = (s.tombo || s.countingCode || '').toLowerCase();
      const matchTerm =
        !searchTerm ||
        code.includes(term) ||
        (s.species && s.species.toLowerCase().includes(term)) ||
        (s.genus && s.genus.toLowerCase().includes(term)) ||
        (s.family && s.family.toLowerCase().includes(term)) ||
        (s.analystName && s.analystName.toLowerCase().includes(term)) ||
        (s.popularName && s.popularName.toLowerCase().includes(term)) ||
        (s.collector && s.collector.toLowerCase().includes(term)) ||
        (s.location && s.location.toLowerCase().includes(term));

      return matchOrder && matchStatus && matchTerm;
    });
  }, [specimens, searchTerm, selectedOrder, selectedStatus]);

  const totalIndividuos = useMemo(() => {
    return specimens.reduce((sum, s) => sum + (parseInt(s.count, 10) || 1), 0);
  }, [specimens]);

  const fileInputRef = useRef(null);

  // Iniciar verificação de amostra
  const handleStartVerification = (sp) => {
    setVerifyingSpecimen(sp);
  };

  const handleSaveVerification = (updated) => {
    if (onUpdateSpecimen) {
      onUpdateSpecimen(updated);
    }
  };

  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        const parsed = parseCsvToSpecimens(text);
        if (!parsed || parsed.length === 0) {
          alert('Nenhum registro válido foi encontrado no arquivo CSV selecionado. Verifique o formato das colunas.');
          return;
        }

        if (onImportSpecimens) {
          await onImportSpecimens(parsed);
        } else {
          alert(`${parsed.length} registro(s) da planilha importados com sucesso!`);
        }
      } catch (err) {
        console.error('Erro ao importar CSV:', err);
        alert('Ocorreu um erro ao processar a planilha CSV: ' + err.message);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="catalog-table-wrapper">
      {/* Input oculto para carregar arquivo de planilha existente */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCsvFileChange}
        accept=".csv,text/csv"
        style={{ display: 'none' }}
      />

      {/* Banner da Planilha Oficial Consolidada */}
      <div className="official-spreadsheet-header-banner">
        <div className="official-banner-left">
          <div className="badge-official-collection">
            <CheckCircle2 size={16} className="text-emerald" />
            <strong>Planilha Oficial da Coleção</strong>
          </div>
          <span className="official-banner-subtitle">
            Dados consolidados e auditados • Acesso simultâneo para todo o laboratório sem conflitos
          </span>
        </div>
        <div className="official-banner-right">
          <span className="live-cloud-indicator">
            <Radio size={14} className="pulse-icon text-emerald" /> Banco em Nuvem Ativo
          </span>
        </div>
      </div>

      {/* Barra Superior da Planilha */}
      <div className="table-top-bar">
        <div className="table-stats">
          <span className="badge-stat">
            <strong>{specimens.length}</strong> Registros na Planilha
          </span>
          <span className="badge-stat">
            <strong>{totalIndividuos}</strong> Indivíduos Totais
          </span>
        </div>

        <div className="table-actions">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            title="Importar dados de uma planilha CSV existente para o BioCount"
          >
            <Upload size={18} />
            <span>Importar Planilha (CSV)</span>
          </button>

          <button
            onClick={() => exportSpecimensToCsv(specimens)}
            className="btn-export-csv"
            title="Exportar planilha completa com todas as variáveis para Excel / CSV"
          >
            <FileSpreadsheet size={18} />
            <span>Exportar Planilha (Excel / CSV)</span>
          </button>

          <button onClick={onAddNew} className="btn-primary">
            <Plus size={18} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Status (Pendente, Rascunho, Verificado) */}
      <div className="status-filter-pills-bar">
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className={`status-pill-btn ${selectedStatus === 'ALL' ? 'active' : ''}`}
        >
          Todos ({statusCounts.all})
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('pendente_verificacao')}
          className={`status-pill-btn pill-pending ${selectedStatus === 'pendente_verificacao' ? 'active' : ''}`}
        >
          <Clock size={14} />
          <span>Aguardando Verificação</span>
          <span className="pill-count">{statusCounts.pendente}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('rascunho')}
          className={`status-pill-btn pill-draft ${selectedStatus === 'rascunho' ? 'active' : ''}`}
        >
          <FileEdit size={14} />
          <span>Rascunhos</span>
          <span className="pill-count">{statusCounts.rascunho}</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus('verificado')}
          className={`status-pill-btn pill-verified ${selectedStatus === 'verificado' ? 'active' : ''}`}
        >
          <CheckCircle2 size={14} />
          <span>Verificados</span>
          <span className="pill-count">{statusCounts.verificado}</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca Textual */}
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Código, Analista, Espécie, Família, Localidade..."
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="btn-clear-search" title="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>

        {orders.length > 2 && (
          <div className="filter-order-select">
            <select
              value={selectedOrder}
              onChange={(e) => setSelectedOrder(e.target.value)}
            >
              <option value="ALL">Todas as Ordens</option>
              {orders.filter(o => o !== 'ALL').map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabela de Dados da Planilha */}
      {specimens.length === 0 ? (
        <div className="empty-table-state empty-spreadsheet-initial">
          <FileSpreadsheet size={44} className="text-emerald" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.8 }} />
          <h3>Planilha de Amostras Pronta</h3>
          <p>Não há espécimes cadastrados no momento. Você pode iniciar um novo registro do zero ou vincular sua planilha existente importando um arquivo CSV.</p>
          <div className="empty-state-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              <Upload size={16} /> Importar Planilha Existente (CSV)
            </button>
            <button onClick={onAddNew} className="btn-primary">
              <Plus size={16} /> Novo Registro
            </button>
          </div>
        </div>
      ) : filteredSpecimens.length === 0 ? (
        <div className="empty-table-state">
          <p>Nenhum registro encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="responsive-table-container">
          <table className="specimens-table">
            <thead>
              <tr>
                <th>Código Contagem</th>
                <th>Status</th>
                <th>Analisado por</th>
                <th>Táxon (Família / Gênero / Espécie)</th>
                <th>Qtd.</th>
                <th>Variáveis</th>
                <th>Validador</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecimens.map((sp) => {
                const code = sp.tombo || sp.countingCode;
                const status = sp.status || 'verificado';
                const varsCount = sp.variables?.length || 0;

                return (
                  <tr key={sp.id} className={`tr-status-${status}`}>
                    {/* Código */}
                    <td className="td-tombo">
                      <span className="tombo-badge">{code}</span>
                    </td>

                    {/* Status */}
                    <td>
                      {status === 'pendente_verificacao' && (
                        <span className="badge-status-table badge-status-pending" title="Aguardando validação">
                          <Clock size={13} /> Pendente
                        </span>
                      )}
                      {status === 'rascunho' && (
                        <span className="badge-status-table badge-status-draft" title="Rascunho em edição">
                          <FileEdit size={13} /> Rascunho
                        </span>
                      )}
                      {status === 'verificado' && (
                        <span className="badge-status-table badge-status-verified" title="Validado e aprovado">
                          <CheckCircle2 size={13} /> Verificado
                        </span>
                      )}
                    </td>

                    {/* Analista */}
                    <td>
                      <div className="analyst-cell">
                        <User size={14} className="text-muted" />
                        <span className="analyst-name">{sp.analystName || sp.collector || 'Não inf.'}</span>
                      </div>
                    </td>

                    {/* Táxon */}
                    <td>
                      <div className="taxon-cell">
                        <strong className="species-name">
                          {[sp.genus, sp.species].filter(Boolean).join(' ') || sp.species || sp.genus || 'Não identificado'}
                        </strong>
                        {sp.popularName && <span className="popular-name">({sp.popularName})</span>}
                        <small className="family-order-text">
                          {[sp.order, sp.family].filter(Boolean).join(' • ') || '—'}
                        </small>
                      </div>
                    </td>

                    {/* Quantidade */}
                    <td className="td-count">
                      <span className="count-pill">{sp.count}</span>
                    </td>

                    {/* Variáveis Contabilizadas */}
                    <td>
                      <span className="badge-vars-pill" title={`${varsCount} características contabilizadas`}>
                        {varsCount} vars
                      </span>
                    </td>

                    {/* Validador */}
                    <td>
                      {sp.verifiedBy ? (
                        <div className="verified-by-cell">
                          <ShieldCheck size={14} className="text-emerald" />
                          <span>{sp.verifiedBy}</span>
                        </div>
                      ) : (
                        <span className="text-muted text-italic">Aguardando</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="td-actions">
                      {/* Botão de Conferir / Validar */}
                      <button
                        type="button"
                        onClick={() => handleStartVerification(sp)}
                        className="btn-action-icon btn-action-verify"
                        title={canValidate() ? 'Conferir e validar amostra' : 'Visualizar conferência (requer treinamento para validar)'}
                      >
                        <ShieldCheck size={16} />
                      </button>

                      {/* Ver Detalhes */}
                      <button
                        type="button"
                        onClick={() => setDetailSpecimen(sp)}
                        className="btn-action-icon"
                        title="Ver ficha completa"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => onEditSpecimen(sp)}
                        className="btn-action-icon text-accent"
                        title="Editar registro"
                      >
                        <Edit size={16} />
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        onClick={() => onDeleteSpecimen(sp.id)}
                        className="btn-action-icon btn-delete"
                        title="Excluir da planilha"
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

      {/* Modal de Detalhes Completos da Ficha */}
      {detailSpecimen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-detail-card">
            <div className="modal-header">
              <div>
                <div className="header-status-line">
                  <span className={`status-badge status-${detailSpecimen.status || 'verificado'}`}>
                    {detailSpecimen.status === 'rascunho' ? 'Rascunho' : detailSpecimen.status === 'pendente_verificacao' ? 'Aguardando Verificação' : 'Verificado'}
                  </span>
                </div>
                <h3>{detailSpecimen.tombo || detailSpecimen.countingCode}</h3>
                <p className="modal-subtitle">{detailSpecimen.species || 'Ficha do Espécime na Planilha'}</p>
              </div>
              <button onClick={() => setDetailSpecimen(null)} className="btn-close" title="Fechar modal">
                <X size={20} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item"><strong>Analista Responsável:</strong> {detailSpecimen.analystName || detailSpecimen.collector || '—'}</div>
              <div className="detail-item"><strong>Quantidade:</strong> {detailSpecimen.count} indivíduo(s)</div>
              <div className="detail-item"><strong>Ordem:</strong> {detailSpecimen.order || '—'}</div>
              <div className="detail-item"><strong>Família:</strong> {detailSpecimen.family || '—'}</div>
              <div className="detail-item"><strong>Gênero:</strong> {detailSpecimen.genus || '—'}</div>
              <div className="detail-item"><strong>Espécie / Morfotipo:</strong> {detailSpecimen.species || '—'}</div>
              <div className="detail-item"><strong>Preservação:</strong> {detailSpecimen.preservation || '—'}</div>
              <div className="detail-item"><strong>Estágio / Sexo:</strong> {detailSpecimen.stage} / {detailSpecimen.sex}</div>
              <div className="detail-item"><strong>Coletor:</strong> {detailSpecimen.collector || '—'}</div>
              <div className="detail-item"><strong>Data Coleta:</strong> {detailSpecimen.date || '—'}</div>
              <div className="detail-item full-width"><strong>Localidade:</strong> {detailSpecimen.location || '—'}</div>

              {/* Auditoria / Validação */}
              {detailSpecimen.verifiedBy && (
                <div className="detail-item full-width detail-audit-box">
                  <div className="audit-header">
                    <ShieldCheck size={16} className="text-emerald" />
                    <strong>Informações da Validação:</strong>
                  </div>
                  <p><strong>Validado por:</strong> {detailSpecimen.verifiedBy} em {detailSpecimen.verifiedAt || 'Data recente'}</p>
                  {detailSpecimen.verificationNotes && (
                    <p className="detail-notes-text"><strong>Parecer do Validador:</strong> {detailSpecimen.verificationNotes}</p>
                  )}
                </div>
              )}

              {/* Variáveis Contabilizadas (~20 caixas de texto) */}
              {detailSpecimen.variables && detailSpecimen.variables.length > 0 && (
                <div className="detail-item full-width">
                  <strong>Variáveis & Características Contabilizadas ({detailSpecimen.variables.length}):</strong>
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

              {detailSpecimen.notes && (
                <div className="detail-item full-width">
                  <strong>Observações Ecológicas:</strong>
                  <p className="detail-notes-text">{detailSpecimen.notes}</p>
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
                  handleStartVerification(sp);
                }}
                className="btn-action-verify"
              >
                <ShieldCheck size={16} />
                <span>Conferir / Validar</span>
              </button>
              <button
                onClick={() => {
                  const sp = detailSpecimen;
                  setDetailSpecimen(null);
                  onEditSpecimen(sp);
                }}
                className="btn-primary"
              >
                Editar Espécime
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoria e Validação (Ao verificar, tira da planilha e acrescenta informações novas) */}
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
