const TOKEN_KEY = 'campus_admin_token';

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Uniform API client — all backend responses use { success, data, meta?, error? }.
 */
export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getAdminToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const json = await res.json().catch(() => ({}));

  if (!json.success) {
    const message = json.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }

  return json;
}

export async function adminLogin(username, password) {
  const json = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAdminToken(json.data.token);
  return json.data;
}

export async function adminLogout() {
  try {
    await api('/api/admin/logout', { method: 'POST', body: '{}' });
  } finally {
    clearAdminToken();
  }
}
