// Gerenciamento de persistência local (LocalStorage) com dados padrão

const COUNTERS_KEY = 'biocount_counters';
const SPECIMENS_KEY = 'biocount_specimens';
const SETTINGS_KEY = 'biocount_settings';

export const INITIAL_COUNTERS = [];

export const INITIAL_SPECIMENS = [];

export const DEFAULT_SETTINGS = {
  soundEnabled: true,
  vibrationEnabled: true,
  theme: 'dark',
  defaultStep: 1,
  csvSeparator: ';'
};

export function loadCounters() {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    // Limpar contadores de exemplo antigos (c1..c4) para iniciar sem nenhum dado
    const isOnlyMocks = Array.isArray(list) && list.length <= 4 && list.every(c => ['c1', 'c2', 'c3', 'c4'].includes(c.id));
    if (isOnlyMocks) {
      localStorage.setItem(COUNTERS_KEY, JSON.stringify([]));
      return [];
    }
    return list;
  } catch (e) {
    console.error('Erro ao carregar contadores:', e);
    return [];
  }
}

export function saveCounters(counters) {
  try {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
  } catch (e) {
    console.error('Erro ao salvar contadores:', e);
  }
}

export function loadSpecimens() {
  try {
    const raw = localStorage.getItem(SPECIMENS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    // Limpar mocks antigos (sp-1, sp-2, sp-3) para iniciar a planilha limpa conforme solicitado
    const isOnlyMocks = Array.isArray(list) && list.length <= 3 && list.every(s => ['sp-1', 'sp-2', 'sp-3'].includes(s.id));
    if (isOnlyMocks) {
      localStorage.setItem(SPECIMENS_KEY, JSON.stringify([]));
      return [];
    }
    return list;
  } catch (e) {
    console.error('Erro ao carregar espécimes:', e);
    return [];
  }
}

export function saveSpecimens(specimens) {
  try {
    localStorage.setItem(SPECIMENS_KEY, JSON.stringify(specimens));
  } catch (e) {
    console.error('Erro ao salvar espécimes:', e);
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erro ao salvar configurações:', e);
  }
}

