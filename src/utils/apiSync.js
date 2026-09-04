// Utilitário de sincronização entre o Frontend (LocalStorage / Offline-First) e a API Backend (Turso/SQLite)

const API_BASE = '/api';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOfficialSpecimensFromApi() {
  try {
    const res = await fetch(`${API_BASE}/specimens/official`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[BioCount API] Backend offline, utilizando dados locais da Planilha Oficial.', e);
  }
  return null;
}

export async function fetchRepositorySpecimensFromApi() {
  try {
    const res = await fetch(`${API_BASE}/specimens/repository`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[BioCount API] Backend offline, utilizando dados locais do Repositório.', e);
  }
  return null;
}

export async function fetchSpecimensFromApi() {
  try {
    const res = await fetch(`${API_BASE}/specimens`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('[BioCount API] Backend offline, utilizando armazenamento local.', e);
  }
  return null;
}

export async function saveSpecimenToApi(specimen) {
  try {
    const res = await fetch(`${API_BASE}/specimens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(specimen)
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

export async function promoteSpecimenToOfficialApi(id, verifierData) {
  try {
    const res = await fetch(`${API_BASE}/specimens/promote/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifierData)
    });
    const data = await res.json();
    if (res.status === 409) {
      return { conflict: true, ...data };
    }
    return { success: res.ok, ...data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function resolveConflictApi(payload) {
  try {
    const res = await fetch(`${API_BASE}/specimens/resolve-conflict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function deleteSpecimenFromApi(id) {
  try {
    const res = await fetch(`${API_BASE}/specimens/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function importOfficialSpecimensBatchApi(specimens) {
  try {
    const res = await fetch(`${API_BASE}/specimens/batch-official`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specimens })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function sendHeartbeatToApi(user, action) {
  if (!user) return;
  try {
    await fetch(`${API_BASE}/presence/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: action || 'Ativo no sistema'
      })
    });
  } catch {
    // Modo offline silencioso
  }
}

export async function fetchOnlineUsersFromApi() {
  try {
    const res = await fetch(`${API_BASE}/presence/online`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    return null;
  }
}

export async function sendActivityToApi(userName, userRole, actionText, code) {
  try {
    await fetch(`${API_BASE}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, userRole, actionText, code })
    });
  } catch {
    // Modo offline silencioso
  }
}

