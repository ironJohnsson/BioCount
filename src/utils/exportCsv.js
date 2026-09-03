// Utilitário para exportar coleções e contagens para planilha (CSV com compatibilidade Excel / UTF-8 BOM)

function escapeCsvField(field, separator = ';') {
  if (field === null || field === undefined) return '';
  let str = String(field);
  // Se contiver delimitador, quebras de linha ou aspas, precisa ser delimitado por aspas
  if (str.includes(separator) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSpecimensToCsv(specimens, separator = ';') {
  const headers = [
    'Número de Tombo / Catálogo',
    'Ordem',
    'Família',
    'Gênero',
    'Espécie / Morfoespécie',
    'Nome Popular',
    'Quantidade de Indivíduos',
    'Coletor(a)',
    'Data de Coleta',
    'Localidade / Coordenadas',
    'Tipo de Preservação',
    'Estágio de Desenvolvimento',
    'Sexo',
    'Observações'
  ];

  const rows = specimens.map(sp => [
    sp.tombo || '',
    sp.order || '',
    sp.family || '',
    sp.genus || '',
    sp.species || '',
    sp.popularName || '',
    sp.count || 0,
    sp.collector || '',
    sp.date || '',
    sp.location || '',
    sp.preservation || '',
    sp.stage || '',
    sp.sex || '',
    sp.notes || ''
  ]);

  const csvContent = [
    headers.map(h => escapeCsvField(h, separator)).join(separator),
    ...rows.map(row => row.map(val => escapeCsvField(val, separator)).join(separator))
  ].join('\r\n');

  // \uFEFF é o Byte Order Mark (BOM) UTF-8 essencial para o Excel no Windows não corromper acentos
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `BioCount_Colecao_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCountersToCsv(counters, separator = ';') {
  const headers = ['ID', 'Nome do Contador', 'Categoria / Táxon', 'Contagem Atual', 'Passo (+/-)', 'Meta'];
  const rows = counters.map(c => [
    c.id,
    c.name,
    c.category || '',
    c.value,
    c.step || 1,
    c.goal || ''
  ]);

  const csvContent = [
    headers.map(h => escapeCsvField(h, separator)).join(separator),
    ...rows.map(row => row.map(val => escapeCsvField(val, separator)).join(separator))
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `BioCount_Contadores_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
