import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, Plus, Edit, Trash2, Tag, Calendar, MapPin, Eye } from 'lucide-react';
import { exportSpecimensToCsv } from '../../utils/exportCsv';

export default function SpecimenTable({
  specimens,
  onEditSpecimen,
  onDeleteSpecimen,
  onAddNew
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('ALL');
  const [detailSpecimen, setDetailSpecimen] = useState(null);

  // Ordens únicas para filtro
  const orders = useMemo(() => {
    const list = new Set(specimens.map(s => s.order).filter(Boolean));
    return ['ALL', ...Array.from(list)];
  }, [specimens]);

  // Filtro composto (busca textual + ordem taxonômica)
  const filteredSpecimens = useMemo(() => {
    return specimens.filter(s => {
      const matchOrder = selectedOrder === 'ALL' || s.order === selectedOrder;
      const term = searchTerm.toLowerCase();
      const matchTerm =
        !searchTerm ||
        (s.tombo && s.tombo.toLowerCase().includes(term)) ||
        (s.species && s.species.toLowerCase().includes(term)) ||
        (s.genus && s.genus.toLowerCase().includes(term)) ||
        (s.family && s.family.toLowerCase().includes(term)) ||
        (s.popularName && s.popularName.toLowerCase().includes(term)) ||
        (s.collector && s.collector.toLowerCase().includes(term)) ||
        (s.location && s.location.toLowerCase().includes(term));

      return matchOrder && matchTerm;
    });
  }, [specimens, searchTerm, selectedOrder]);

  const totalIndividuos = useMemo(() => {
    return specimens.reduce((sum, s) => sum + (parseInt(s.count, 10) || 1), 0);
  }, [specimens]);

  return (
    <div className="catalog-table-wrapper">
      {/* Barra Superior da Planilha */}
      <div className="table-top-bar">
        <div className="table-stats">
          <span className="badge-stat"><strong>{specimens.length}</strong> Registros Catalogados</span>
          <span className="badge-stat"><strong>{totalIndividuos}</strong> Indivíduos Totais</span>
        </div>

        <div className="table-actions">
          <button
            onClick={() => exportSpecimensToCsv(specimens)}
            className="btn-export-csv"
            title="Exportar registros diretamente para planilha Excel / CSV"
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

      {/* Barra de Filtros e Busca */}
      <div className="search-filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Tombo, Espécie, Família, Coletor, Localidade..."
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="btn-clear-search">✕</button>
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

      {/* Tabela de Dados */}
      {filteredSpecimens.length === 0 ? (
        <div className="empty-table-state">
          <p>Nenhum espécime encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="responsive-table-container">
          <table className="specimens-table">
            <thead>
              <tr>
                <th>Tombo / ID</th>
                <th>Táxon (Família / Gênero / Espécie)</th>
                <th>Qtd.</th>
                <th>Preservação</th>
                <th>Coletor & Data</th>
                <th>Localidade</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpecimens.map((sp) => (
                <tr key={sp.id}>
                  <td className="td-tombo">
                    <span className="tombo-badge">{sp.tombo}</span>
                  </td>
                  <td>
                    <div className="taxon-cell">
                      <strong className="species-name">{sp.species || sp.genus || 'Não identificado'}</strong>
                      {sp.popularName && <span className="popular-name">({sp.popularName})</span>}
                      <small className="family-order-text">
                        {[sp.order, sp.family].filter(Boolean).join(' • ')}
                      </small>
                    </div>
                  </td>
                  <td className="td-count">
                    <span className="count-pill">{sp.count}</span>
                  </td>
                  <td>
                    <span className="preservation-pill">{sp.preservation || 'Seco'}</span>
                  </td>
                  <td>
                    <div className="collector-cell">
                      <span>{sp.collector || '—'}</span>
                      <small className="text-muted">{sp.date || '—'}</small>
                    </div>
                  </td>
                  <td className="td-location" title={sp.location}>
                    <span className="location-truncate">{sp.location || '—'}</span>
                  </td>
                  <td className="td-actions">
                    <button
                      onClick={() => setDetailSpecimen(sp)}
                      className="btn-action-icon"
                      title="Ver detalhes completos"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => onEditSpecimen(sp)}
                      className="btn-action-icon text-accent"
                      title="Editar registro"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteSpecimen(sp.id)}
                      className="btn-action-icon btn-delete"
                      title="Excluir espécime"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalhes Rápidos do Espécime */}
      {detailSpecimen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-detail-card">
            <div className="modal-header">
              <div>
                <h3>{detailSpecimen.tombo}</h3>
                <p className="modal-subtitle">{detailSpecimen.species || 'Espécime da Coleção'}</p>
              </div>
              <button onClick={() => setDetailSpecimen(null)} className="btn-close">✕</button>
            </div>

            <div className="detail-grid">
              <div className="detail-item"><strong>Ordem:</strong> {detailSpecimen.order || '—'}</div>
              <div className="detail-item"><strong>Família:</strong> {detailSpecimen.family || '—'}</div>
              <div className="detail-item"><strong>Gênero:</strong> {detailSpecimen.genus || '—'}</div>
              <div className="detail-item"><strong>Espécie / Morfotipo:</strong> {detailSpecimen.species || '—'}</div>
              <div className="detail-item"><strong>Nome Popular:</strong> {detailSpecimen.popularName || '—'}</div>
              <div className="detail-item"><strong>Quantidade:</strong> {detailSpecimen.count}</div>
              <div className="detail-item"><strong>Preservação:</strong> {detailSpecimen.preservation || '—'}</div>
              <div className="detail-item"><strong>Estágio / Sexo:</strong> {detailSpecimen.stage} / {detailSpecimen.sex}</div>
              <div className="detail-item"><strong>Coletor:</strong> {detailSpecimen.collector || '—'}</div>
              <div className="detail-item"><strong>Data Coleta:</strong> {detailSpecimen.date || '—'}</div>
              <div className="detail-item full-width"><strong>Localidade:</strong> {detailSpecimen.location || '—'}</div>
              {detailSpecimen.notes && (
                <div className="detail-item full-width">
                  <strong>Notas Ecológicas:</strong>
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
    </div>
  );
}
