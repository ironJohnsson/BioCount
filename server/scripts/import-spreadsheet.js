import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import dotenv from 'dotenv';

dotenv.config();

function ask(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Parser flexível e robusto de CSV
function parseCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const cleanText = csvText.replace(/^\uFEFF/, '');
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

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
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

  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map(h => h.trim().toLowerCase());
  const dataRows = rows.slice(1);

  const findColIndex = (candidates) => {
    return rawHeaders.findIndex(h => candidates.some(c => h.includes(c.toLowerCase())));
  };

  const colCode = findColIndex(['código', 'codigo', 'tombo', 'code', 'amostra']);
  const colAnalyst = findColIndex(['analista', 'responsável', 'responsavel', 'autor']);
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
    const code = getVal(colCode) || `COL-${String(idx + 1).padStart(4, '0')}`;

    // Processar variáveis ("Nome: Valor | Nome: Valor" ou texto)
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
      countingCode: code.toUpperCase().trim(),
      analystName: getVal(colAnalyst) || 'Coleção Oficial',
      analystRole: 'professor',
      count: isNaN(countNum) ? 1 : Math.max(1, countNum),
      order: getVal(colOrder),
      family: getVal(colFamily),
      genus: getVal(colGenus),
      species: getVal(colSpecies) || 'Espécie não identificada',
      popularName: getVal(colPopName),
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

async function main() {
  console.log('\n======================================================');
  console.log('BioCount - Carga Inicial da Planilha Oficial (Turso / SQLite)');
  console.log('======================================================\n');

  let dbUrl = process.env.TURSO_DATABASE_URL || 'file:biocount.db';
  let authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  let filePath = process.argv[2];

  if (!filePath) {
    filePath = await ask('Caminho para o arquivo da planilha existente (.csv)', 'planilha_exemplo.csv');
  }

  const resolvedPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n[ERRO] Arquivo não encontrado: ${resolvedPath}`);
    console.log('\nDica: Certifique-se de salvar sua planilha existente no Excel como formato CSV (separado por vírgulas ou ponto e vírgula).');
    process.exit(1);
  }

  console.log(`\nLendo arquivo: ${resolvedPath}`);
  const csvContent = fs.readFileSync(resolvedPath, 'utf-8');
  const items = parseCsv(csvContent);

  if (items.length === 0) {
    console.error('[ERRO] Nenhum registro pôde ser extraído do arquivo CSV. Verifique o cabeçalho.');
    process.exit(1);
  }

  console.log(`Total de registros detectados na planilha: ${items.length}`);
  console.log(`Conectando ao banco: ${dbUrl.startsWith('file:') ? 'SQLite Local' : 'Turso Cloud Database'}`);

  const db = createClient({ url: dbUrl, authToken });

  // Garantir existência da tabela specimens
  await db.execute(`
    CREATE TABLE IF NOT EXISTS specimens (
      id TEXT PRIMARY KEY,
      counting_code TEXT UNIQUE NOT NULL,
      analyst_name TEXT NOT NULL,
      analyst_role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho', 'pendente_verificacao', 'verificado')),
      count INTEGER NOT NULL DEFAULT 1,
      order_name TEXT,
      family TEXT,
      genus TEXT,
      species TEXT,
      popular_name TEXT,
      collector TEXT,
      date_collected TEXT,
      location TEXT,
      preservation TEXT,
      stage TEXT,
      sex TEXT,
      notes TEXT,
      variables_json TEXT,
      verified_by TEXT,
      verified_by_id TEXT,
      verified_at TEXT,
      verification_notes TEXT,
      in_repository INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.execute(`ALTER TABLE specimens ADD COLUMN in_repository INTEGER NOT NULL DEFAULT 1`);
  } catch {}
  try {
    await db.execute(`ALTER TABLE specimens ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
  } catch {}

  let successCount = 0;
  let errorCount = 0;

  console.log('\nIniciando inserção na Planilha Oficial (in_repository = 0, status = "verificado")...\n');

  for (const item of items) {
    const id = `sp-seed-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const variablesJson = JSON.stringify(item.variables || []);

    try {
      await db.execute({
        sql: `
          INSERT INTO specimens (
            id, counting_code, analyst_name, analyst_role, status, count,
            order_name, family, genus, species, popular_name, collector,
            date_collected, location, preservation, stage, sex, notes,
            variables_json, verified_by, verified_at, in_repository, version, updated_at
          ) VALUES (?, ?, ?, ?, 'verificado', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(counting_code) DO UPDATE SET
            analyst_name = excluded.analyst_name,
            count = excluded.count,
            order_name = excluded.order_name,
            family = excluded.family,
            genus = excluded.genus,
            species = excluded.species,
            popular_name = excluded.popular_name,
            collector = excluded.collector,
            date_collected = excluded.date_collected,
            location = excluded.location,
            preservation = excluded.preservation,
            stage = excluded.stage,
            sex = excluded.sex,
            notes = excluded.notes,
            variables_json = excluded.variables_json,
            in_repository = 0,
            status = 'verificado',
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [
          id,
          item.countingCode,
          item.analystName,
          item.analystRole,
          item.count,
          item.order,
          item.family,
          item.genus,
          item.species,
          item.popularName,
          item.collector,
          item.date,
          item.location,
          item.preservation,
          item.stage,
          item.sex,
          item.notes,
          variablesJson,
          'Carga Inicial da Coleção',
          new Date().toLocaleString('pt-BR')
        ]
      });
      successCount++;
      process.stdout.write(`\r[OK] Inseridos/Atualizados: ${successCount}/${items.length} (Último: ${item.countingCode})`);
    } catch (err) {
      errorCount++;
      console.error(`\n[FALHA] Código ${item.countingCode}: ${err.message}`);
    }
  }

  console.log('\n\n======================================================');
  console.log('Carga Concluída com Sucesso!');
  console.log(`- Sucessos: ${successCount}`);
  console.log(`- Falhas: ${errorCount}`);
  console.log('Todos os dados já estão visíveis na Planilha Oficial para todos os usuários em tempo real.');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});

