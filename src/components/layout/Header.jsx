import React from 'react';
import { Layers, TableProperties, Camera, Bug, FileSpreadsheet, Sparkles } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  totalCounters,
  totalSpecimens,
  onQuickExport
}) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo-badge">
          <Bug size={26} className="text-emerald" />
        </div>
        <div className="brand-texts">
          <div className="brand-title-row">
            <h1 className="brand-title">BioCount</h1>
            <span className="brand-tag">Coleções Biológicas</span>
          </div>
          <p className="brand-tagline">Contador de Cliques, Scanner OCR & Catalogação em Planilha</p>
        </div>
      </div>

      {/* Navegação por Abas */}
      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === 'counters' ? 'active' : ''}`}
          onClick={() => setActiveTab('counters')}
        >
          <Layers size={18} />
          <span>Contador</span>
          {totalCounters > 0 && <span className="tab-pill">{totalCounters}</span>}
        </button>

        <button
          className={`nav-tab ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <TableProperties size={18} />
          <span>Catalogação & Planilha</span>
          {totalSpecimens > 0 && <span className="tab-pill">{totalSpecimens}</span>}
        </button>

        <button
          className={`nav-tab ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={18} />
          <span>Scanner OCR</span>
          <span className="tab-badge-new">Câmera</span>
        </button>
      </nav>

      {/* Ação Rápida */}
      <div className="header-actions">
        <button
          onClick={onQuickExport}
          className="btn-header-export"
          title="Exportar dados diretamente para planilha Excel/CSV"
        >
          <FileSpreadsheet size={16} />
          <span className="btn-text">Exportar Planilha</span>
        </button>
      </div>
    </header>
  );
}
