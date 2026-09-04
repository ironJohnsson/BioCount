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
    'Código Contagem / Tombo',
    'Status',
    'Analista Responsável',
    'Validador',
    'Data de Validação',
    'Parecer do Validador',
    'Ordem',
    'Família',
    'Gênero',
    'Espécie / Morfoespécie',
    'Nome Popular',
    'Quantidade de Indivíduos',
    'Variáveis Contabilizadas (Características)',
    'Coletor(a)',
    'Data de Coleta',
    'Localidade / Coordenadas',
    'Tipo de Preservação',
    'Estágio de Desenvolvimento',
    'Sexo',
    'Observações Ecológicas'
  ];

  const rows = specimens.map(sp => {
    // Formatar variáveis em string legível: "Nome: Valor | Nome: Valor"
    const varsString = (sp.variables || [])
      .map(v => `${v.name}: ${v.value || 'N/A'}`)
      .join(' | ');

    return [
      sp.tombo || sp.countingCode || '',
      sp.status || 'verificado',
      sp.analystName || sp.collector || '',
      sp.verifiedBy || '',
      sp.verifiedAt || '',
      sp.verificationNotes || '',
      sp.order || '',
      sp.family || '',
      sp.genus || '',
      sp.species || '',
      sp.popularName || '',
      sp.count || 0,
      varsString,
      sp.collector || '',
      sp.date || '',
      sp.location || '',
      sp.preservation || '',
      sp.stage || '',
      sp.sex || '',
      sp.notes || ''
    ];
  });

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
  link.setAttribute('download', `BioCount_Planilha_Colecao_${timestamp}.csv`);
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

// Parser inteligente para importar planilha existente (CSV com delimitadores ; ou , ou TAB)
export function parseCsvToSpecimens(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Remove Byte Order Mark (BOM) se existir
  const cleanText = csvText.replace(/^\uFEFF/, '');

  // Detectar separador principal (';' ou ',' ou '\t') na primeira linha não vazia
  const lines = cleanText.split(/\r\n|\n|\r/);
  const headerLine = lines.find(l => l.trim().length > 0);
  if (!headerLine) return [];

  let separator = ';';
  const countSemicolon = (headerLine.match(/;/g) || []).length;
  const countComma = (headerLine.match(/,/g) || []).length;
  const countTab = (headerLine.match(/\t/g) || []).length;
  if (countComma > countSemicolon && countComma > countTab) {
    separator = ',';
  } else if (countTab > countSemicolon && countTab > countComma) {
    separator = '\t';
  }

  // Parser robusto que respeita campos entre aspas que contêm quebras de linha ou o delimitador
  const parseRows = (text, sep) => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // pular aspa duplicada
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === sep && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // pular \n
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(val => val.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const allRows = parseRows(cleanText, separator);
  if (allRows.length < 2) return [];

  const rawHeaders = allRows[0].map(h => h.trim().toLowerCase());
  const dataRows = allRows.slice(1);

  // Mapear cabeçalhos flexíveis
  const findColIndex = (candidates) => {
    return rawHeaders.findIndex(h => candidates.some(c => h.includes(c.toLowerCase())));
  };

  const colCode = findColIndex(['código', 'codigo', 'tombo', 'code', 'amostra']);
  const colStatus = findColIndex(['status', 'situação', 'situacao', 'estado']);
  const colAnalyst = findColIndex(['analista', 'responsável', 'responsavel', 'autor']);
  const colValidator = findColIndex(['validador', 'verificador', 'auditor']);
  const colValidDate = findColIndex(['data de validação', 'data validação', 'validado em']);
  const colValidNotes = findColIndex(['parecer', 'observações da validação', 'notas validação']);
  const colOrder = findColIndex(['ordem', 'order']);
  const colFamily = findColIndex(['família', 'familia', 'family']);
  const colGenus = findColIndex(['gênero', 'genero', 'genus']);
  const colSpecies = findColIndex(['espécie', 'especie', 'morfoespécie', 'morfoespecie', 'species', 'taxon']);
  const colPopName = findColIndex(['nome popular', 'popular', 'vernacular']);
  const colCount = findColIndex(['quantidade', 'qtd', 'individuos', 'indivíduos', 'count', 'total']);
  const colVars = findColIndex(['variáveis', 'variaveis', 'características', 'caracteristicas', 'variables']);
  const colCollector = findColIndex(['coletor', 'coletado por', 'collector']);
  const colDate = findColIndex(['data de coleta', 'data coleta', 'coleta data', 'data']);
  const colLocation = findColIndex(['localidade', 'local', 'coordenadas', 'location']);
  const colPreserv = findColIndex(['preservação', 'preservacao', 'preservation', 'fixação']);
  const colStage = findColIndex(['estágio', 'estagio', 'fase', 'stage']);
  const colSex = findColIndex(['sexo', 'sex']);
  const colNotes = findColIndex(['observações', 'observacoes', 'notas', 'notes']);

  return dataRows.map((row, idx) => {
    const getVal = (colIdx) => (colIdx >= 0 && row[colIdx] ? row[colIdx] : '');

    const code = getVal(colCode) || `IMP-${String(idx + 1).padStart(3, '0')}`;
    const rawStatus = getVal(colStatus).toLowerCase();
    let status = 'verificado';
    if (rawStatus.includes('rascunho') || rawStatus.includes('draft')) {
      status = 'rascunho';
    } else if (rawStatus.includes('pendente') || rawStatus.includes('aguardando') || rawStatus.includes('treinamento')) {
      status = 'pendente_verificacao';
    }

    // Processar variáveis (formato "Nome: Valor | Nome: Valor" ou simplesmente texto)
    const rawVars = getVal(colVars);
    let variables = [];
    if (rawVars) {
      if (rawVars.includes('|') || rawVars.includes(':')) {
        const parts = rawVars.split('|');
        variables = parts.map((part, vIdx) => {
          const colonIdx = part.indexOf(':');
          if (colonIdx > 0) {
            return {
              id: `v-${idx}-${vIdx}`,
              name: part.slice(0, colonIdx).trim(),
              value: part.slice(colonIdx + 1).trim()
            };
          }
          return {
            id: `v-${idx}-${vIdx}`,
            name: `Var ${vIdx + 1}`,
            value: part.trim()
          };
        });
      } else {
        variables = [{ id: `v-${idx}-0`, name: 'Obs/Característica', value: rawVars }];
      }
    }

    const countNum = parseInt(getVal(colCount), 10);

    return {
      id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      tombo: code,
      countingCode: code,
      status: status,
      analystName: getVal(colAnalyst) || 'Importado via Planilha',
      verifiedBy: getVal(colValidator),
      verifiedAt: getVal(colValidDate),
      verificationNotes: getVal(colValidNotes),
      order: getVal(colOrder),
      family: getVal(colFamily),
      genus: getVal(colGenus),
      species: getVal(colSpecies) || 'Espécie não informada',
      popularName: getVal(colPopName),
      count: isNaN(countNum) ? 1 : Math.max(1, countNum),
      variables: variables,
      collector: getVal(colCollector),
      date: getVal(colDate),
      location: getVal(colLocation),
      preservation: getVal(colPreserv) || 'Via Seca',
      stage: getVal(colStage) || 'Adulto',
      sex: getVal(colSex) || 'Indeterminado',
      notes: getVal(colNotes)
    };
  });
}
