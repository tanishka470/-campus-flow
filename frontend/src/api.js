const API_BASE = '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchUsers() {
  return request('/api/users');
}

export function fetchCards() {
  return request('/api/cards');
}

export function fetchAccessLogs(limit = 30) {
  return request(`/api/access-logs?limit=${limit}`);
}

export function scanCard(cardId, { gate = 'HOSTEL', direction = 'OUT' } = {}) {
  return request('/api/access/scan', {
    method: 'POST',
    body: JSON.stringify({ cardId, gate, direction }),
  });
}

export function fetchActivePasses() {
  return request('/api/passes/active');
}

export function registerCard({ cardId, userId, active = true }) {
  return request('/api/cards', {
    method: 'POST',
    body: JSON.stringify({ cardId, userId, active }),
  });
}

export function setCardActive(id, active) {
  return request(`/api/cards/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}
