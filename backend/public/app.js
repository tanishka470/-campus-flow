import { api, adminLogin, adminLogout, getAdminToken } from './apiClient.js';

const FLOW_STEPS = [
  { gate: 'HOSTEL', direction: 'OUT', label: 'Hostel exit' },
  { gate: 'MAIN', direction: 'OUT', label: 'Main exit' },
  { gate: 'MAIN', direction: 'IN', label: 'Main entry' },
  { gate: 'HOSTEL', direction: 'IN', label: 'Hostel entry' },
];

let state = {
  tab: 'simulator',
  cardId: 'CARD-1001',
  gate: 'HOSTEL',
  direction: 'OUT',
  scanResult: null,
  scanError: '',
  adminUser: null,
  admin: { users: [], cards: [], logs: [], passes: [], error: '', lastSynced: null },
  newCardId: '',
  newUserId: '',
  loginError: '',
};

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

function statusLabel(status) {
  return status === 'GRANTED' ? 'Approved' : 'Denied';
}

async function loadAdmin() {
  if (!getAdminToken()) {
    state.admin.error = '';
    render();
    return;
  }
  try {
    const [usersRes, cardsRes, logsRes, passesRes, meRes] = await Promise.all([
      api('/api/users?page=1&limit=50'),
      api('/api/cards?page=1&limit=50'),
      api('/api/access-logs?page=1&limit=40'),
      api('/api/passes/active?page=1&limit=50'),
      api('/api/admin/me'),
    ]);
    state.admin.users = usersRes.data;
    state.admin.cards = cardsRes.data;
    state.admin.logs = logsRes.data;
    state.admin.passes = passesRes.data;
    state.adminUser = meRes.data.admin;
    state.admin.error = '';
    state.admin.lastSynced = new Date();
    if (!state.newUserId && state.admin.users.length) {
      state.newUserId = String(state.admin.users[0].id);
    }
  } catch (e) {
    if (e.status === 401) {
      state.adminUser = null;
      state.admin.error = 'Please sign in to view admin data.';
    } else {
      state.admin.error = e.message;
    }
  }
  render();
}

async function doScan(cardId, gate, direction) {
  state.scanError = '';
  state.scanResult = null;
  render();
  try {
    const json = await api('/api/access/scan', {
      method: 'POST',
      body: JSON.stringify({ cardId, gate, direction }),
    });
    state.cardId = cardId;
    state.gate = gate;
    state.direction = direction;
    state.scanResult = json.data;
    if (getAdminToken()) {
      await loadAdmin();
    }
  } catch (e) {
    state.scanError = e.message;
    render();
  }
}

function renderLoginPanel() {
  return `
    <div class="panel">
      <h2 class="panel-title">Admin sign in</h2>
      <p class="panel-desc">College staff only. Gate scans work without login.</p>
      ${state.loginError ? `<p class="error-text">${esc(state.loginError)}</p>` : ''}
      <label for="login-user">Username</label>
      <input id="login-user" value="admin@college.edu" autocomplete="username" />
      <label for="login-pass">Password</label>
      <input id="login-pass" type="password" autocomplete="current-password" />
      <button type="button" class="btn btn-primary" id="btn-login">Sign in</button>
      <p class="panel-desc" style="margin-top:1rem">Default (change in .env): admin@college.edu / CampusAdmin@2026</p>
    </div>`;
}

function renderSimulator() {
  const el = document.getElementById('panel-simulator');
  let resultHtml = '';
  if (state.scanError) {
    resultHtml = `<p class="error-text">${esc(state.scanError)}</p>`;
  } else if (state.scanResult) {
    const r = state.scanResult;
    const cls = r.status === 'GRANTED' ? 'granted' : 'denied';
    resultHtml = `
      <div class="result-box ${cls}">
        <span class="badge ${cls}">${esc(statusLabel(r.status))}</span>
        <p class="result-title" style="margin-top:0.5rem">${esc(r.user?.name || 'Visitor')} · ${esc(r.cardId)}</p>
        <p class="result-meta">${esc(r.gate)} gate · ${r.direction === 'OUT' ? 'Exit' : 'Entry'}</p>
        ${r.reason ? `<p class="error-text" style="margin-top:0.35rem">${esc(r.reason)}</p>` : ''}
        ${
          r.pass
            ? `<div class="pass-slip">
            <p class="pass-slip-title">Exit pass issued</p>
            <code>${esc(r.pass.passCode)}</code>
            <p class="result-meta" style="margin-top:0.35rem">Valid until ${esc(fmtTime(r.pass.validUntil))}</p>
          </div>`
            : ''
        }
      </div>`;
  }

  el.innerHTML = `
    <div class="panel">
      <h2 class="panel-title">Gate terminal</h2>
      <p class="panel-desc">Simulates the card reader (public API — no admin login).</p>
      <label for="inp-card">Card number</label>
      <input id="inp-card" value="${esc(state.cardId)}" autocomplete="off" />
      <div class="form-row">
        <div>
          <label for="inp-gate">Location</label>
          <select id="inp-gate">
            <option value="HOSTEL" ${state.gate === 'HOSTEL' ? 'selected' : ''}>Hostel gate</option>
            <option value="MAIN" ${state.gate === 'MAIN' ? 'selected' : ''}>Main gate</option>
          </select>
        </div>
        <div>
          <label for="inp-dir">Movement</label>
          <select id="inp-dir">
            <option value="OUT" ${state.direction === 'OUT' ? 'selected' : ''}>Exit</option>
            <option value="IN" ${state.direction === 'IN' ? 'selected' : ''}>Entry</option>
          </select>
        </div>
      </div>
      <div class="step-row">
        <span class="step-label">Full campus exit flow</span>
        ${FLOW_STEPS.map(
          (s) =>
            `<button type="button" class="btn btn-secondary" data-step="${esc(s.gate)}" data-dir="${esc(s.direction)}">${esc(s.label)}</button>`
        ).join('')}
      </div>
      <button type="button" class="btn btn-primary" id="btn-scan">Submit scan</button>
      ${resultHtml}
    </div>`;

  el.querySelector('#inp-card').oninput = (e) => {
    state.cardId = e.target.value;
  };
  el.querySelector('#inp-gate').onchange = (e) => {
    state.gate = e.target.value;
  };
  el.querySelector('#inp-dir').onchange = (e) => {
    state.direction = e.target.value;
  };
  el.querySelector('#btn-scan').onclick = () =>
    doScan(state.cardId.trim(), state.gate, state.direction);
  el.querySelectorAll('[data-step]').forEach((btn) => {
    btn.onclick = () => doScan(state.cardId.trim(), btn.dataset.step, btn.dataset.dir);
  });
}

function renderAdmin() {
  const el = document.getElementById('panel-admin');
  if (!getAdminToken()) {
    el.innerHTML = renderLoginPanel();
    el.querySelector('#btn-login').onclick = async () => {
      state.loginError = '';
      try {
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;
        await adminLogin(user, pass);
        await loadAdmin();
      } catch (e) {
        state.loginError = e.message;
        render();
      }
    };
    return;
  }

  const a = state.admin;
  const latest = a.logs[0];

  el.innerHTML = `
    <div class="panel live-panel">
      <div class="live-panel-header">
        <h2 class="panel-title">Today&apos;s gate register</h2>
        <span class="sync-hint">${state.adminUser ? esc(state.adminUser.name) : ''} · <button type="button" class="btn btn-text" id="btn-logout">Sign out</button></span>
      </div>
      ${a.error ? `<p class="error-text">${esc(a.error)}</p>` : ''}
      ${
        latest
          ? `<div class="latest-entry">
        <span class="badge ${latest.status === 'GRANTED' ? 'granted' : 'denied'}">${esc(statusLabel(latest.status))}</span>
        <span class="entry-main">${esc(latest.userName || '—')} · ${esc(latest.cardId)}</span>
        <span class="entry-sub">${esc(latest.gate)} · ${latest.direction === 'OUT' ? 'Exit' : 'Entry'} · ${esc(fmtTime(latest.timestamp))}</span>
      </div>`
          : '<p class="empty-hint">No entries yet.</p>'
      }
    </div>
    <div class="grid-2">
      <div class="panel"><h2 class="panel-title">Students</h2><div class="table-wrap">${usersTable(a.users)}</div></div>
      <div class="panel"><h2 class="panel-title">ID cards</h2><div class="table-wrap">${cardsSection(a)}</div></div>
      <div class="panel" style="grid-column:1/-1"><h2 class="panel-title">Active exit passes</h2><div class="table-wrap">${passesTable(a.passes)}</div></div>
      <div class="panel" style="grid-column:1/-1"><h2 class="panel-title">Access register</h2><div class="table-wrap">${logsTable(a.logs)}</div></div>
    </div>`;

  el.querySelector('#btn-logout').onclick = async () => {
    await adminLogout();
    state.adminUser = null;
    render();
  };

  el.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.toggle;
      const card = a.cards.find((c) => String(c.id) === id);
      if (!card) return;
      await api(`/api/cards/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !card.active }),
      });
      await loadAdmin();
    };
  });

  const form = el.querySelector('#form-card');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/cards', {
        method: 'POST',
        body: JSON.stringify({
          cardId: state.newCardId.trim(),
          userId: Number(state.newUserId),
          active: true,
        }),
      });
      state.newCardId = '';
      await loadAdmin();
    };
    form.querySelector('#newCardId').oninput = (ev) => {
      state.newCardId = ev.target.value;
    };
    form.querySelector('#newUserId').onchange = (ev) => {
      state.newUserId = ev.target.value;
    };
  }
}

function usersTable(users) {
  return `<table><thead><tr><th>Roll</th><th>Name</th><th>Department</th></tr></thead><tbody>
    ${users.map((u) => `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.department)}</td></tr>`).join('')}
  </tbody></table>`;
}

function cardsSection(a) {
  return `<table><thead><tr><th>Card no.</th><th>Student</th><th>Status</th><th></th></tr></thead><tbody>
    ${a.cards
      .map(
        (c) => `<tr>
      <td>${esc(c.cardId)}</td><td>${esc(c.userName)}</td>
      <td><span class="badge ${c.active ? 'active-yes' : 'active-no'}">${c.active ? 'Valid' : 'Blocked'}</span></td>
      <td><button type="button" class="btn btn-text" data-toggle="${c.id}">${c.active ? 'Block' : 'Unblock'}</button></td>
    </tr>`
      )
      .join('')}
  </tbody></table>
  <div class="subsection">
    <h3>Issue new card</h3>
    <form id="form-card" class="form-inline">
      <div><label for="newCardId">Card number</label><input id="newCardId" placeholder="CARD-2001" value="${esc(state.newCardId)}" required /></div>
      <div><label for="newUserId">Student</label><select id="newUserId">${a.users.map((u) => `<option value="${u.id}" ${String(u.id) === state.newUserId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></div>
      <button type="submit" class="btn btn-primary">Save</button>
    </form>
  </div>`;
}

function passesTable(passes) {
  if (!passes.length) return '<p class="empty-hint">No passes currently active.</p>';
  return `<table><thead><tr><th>Pass ID</th><th>Student</th><th>Card</th></tr></thead><tbody>
    ${passes.map((p) => `<tr><td><code>${esc(p.passCode)}</code></td><td>${esc(p.userName)}</td><td>${esc(p.cardId)}</td></tr>`).join('')}
  </tbody></table>`;
}

function logsTable(logs) {
  if (!logs.length) return '<p class="empty-hint">No records yet.</p>';
  return `<table><thead><tr><th>Date &amp; time</th><th>Gate</th><th>Card</th><th>Student</th><th>Decision</th></tr></thead><tbody>
    ${logs
      .map(
        (l, i) => `<tr class="${i === 0 ? 'row-latest' : ''}">
      <td>${esc(fmtTime(l.timestamp))}</td><td>${esc(l.gate)} ${l.direction === 'OUT' ? 'Exit' : 'Entry'}</td>
      <td>${esc(l.cardId)}</td><td>${esc(l.userName || '—')}</td>
      <td><span class="badge ${l.status === 'GRANTED' ? 'granted' : 'denied'}">${esc(statusLabel(l.status))}</span></td>
    </tr>`
      )
      .join('')}
  </tbody></table>`;
}

function render() {
  renderSimulator();
  renderAdmin();
}

document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.onclick = () => {
    state.tab = tab.dataset.tab;
    document.querySelectorAll('.nav-tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.tab === state.tab)
    );
    document.getElementById('panel-simulator').hidden = state.tab !== 'simulator';
    document.getElementById('panel-admin').hidden = state.tab !== 'admin';
    if (state.tab === 'admin') loadAdmin();
  };
});

setInterval(() => {
  if (state.tab === 'admin' && getAdminToken()) loadAdmin();
}, 4000);

render();
