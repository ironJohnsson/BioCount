// Gerenciamento de persistência local (LocalStorage) com dados padrão

const COUNTERS_KEY = 'biocount_counters';
const SPECIMENS_KEY = 'biocount_specimens';
const SETTINGS_KEY = 'biocount_settings';

export const INITIAL_COUNTERS = [
  {
    id: 'c1',
    name: 'Operárias (Trabalhadoras)',
    category: 'Caste / Morfotipo',
    value: 12,
    step: 1,
    color: '#059669', // Emerald
    goal: 50,
  },
  {
    id: 'c2',
    name: 'Soldados',
    category: 'Caste / Morfotipo',
    value: 3,
    step: 1,
    color: '#d97706', // Amber
    goal: 10,
  },
  {
    id: 'c3',
    name: 'Fêmeas Aladas',
    category: 'Sexagem',
    value: 1,
    step: 1,
    color: '#7c3aed', // Purple
    goal: 5,
  },
  {
    id: 'c4',
    name: 'Larvas / Ninfas',
    category: 'Estágio de Vida',
    value: 7,
    step: 1,
    color: '#0284c7', // Blue
    goal: 20,
  }
];

export const INITIAL_SPECIMENS = [
  {
    id: 'sp-1',
    tombo: 'BIO-2026-001',
    order: 'Hymenoptera',
    family: 'Formicidae',
    genus: 'Atta',
    species: 'Atta sexdens',
    popularName: 'Saúva-limão',
    count: 15,
    collector: 'M. L. Johnsson',
    date: '2026-08-20',
    location: 'Mata Atlântica, SP, Brasil (-23.5505, -46.6333)',
    preservation: 'Seco / Alfinete',
    stage: 'Adulto',
    sex: 'Fêmea / Operária',
    notes: 'Amostra coletada próxima ao formigueiro principal em trilha de forrageamento.'
  },
  {
    id: 'sp-2',
    tombo: 'BIO-2026-002',
    order: 'Coleoptera',
    family: 'Scarabaeidae',
    genus: 'Canthon',
    species: 'Canthon sp.',
    popularName: 'Rola-bosta',
    count: 4,
    collector: 'M. L. Johnsson',
    date: '2026-08-21',
    location: 'Fragmento de Cerrado, MG (-19.9208, -43.9378)',
    preservation: 'Álcool 70%',
    stage: 'Adulto',
    sex: 'Indeterminado',
    notes: 'Armadilha pitfall com isca de fezes.'
  }
];

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
    return raw ? JSON.parse(raw) : INITIAL_COUNTERS;
  } catch (e) {
    console.error('Erro ao carregar contadores:', e);
    return INITIAL_COUNTERS;
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
    return raw ? JSON.parse(raw) : INITIAL_SPECIMENS;
  } catch (e) {
    console.error('Erro ao carregar espécimes:', e);
    return INITIAL_SPECIMENS;
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

