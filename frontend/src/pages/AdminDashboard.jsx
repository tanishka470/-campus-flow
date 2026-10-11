import { useCallback, useEffect, useState } from 'react';
import {
  fetchAccessLogs,
  fetchActivePasses,
  fetchCards,
  fetchUsers,
  registerCard,
  setCardActive,
} from '../api.js';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminDashboard({ refreshToken, isActive }) {
  const [users, setUsers] = useState([]);
  const [cards, setCards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [passes, setPasses] = useState([]);
  const [error, setError] = useState('');
  const [newCardId, setNewCardId] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const load = useCallback(async () => {
    try {
      const [u, c, l, p] = await Promise.all([
        fetchUsers(),
        fetchCards(),
        fetchAccessLogs(40),
        fetchActivePasses(),
      ]);
      setUsers(u);
      setCards(c);
      setLogs(l);
      setPasses(p);
      setError('');
      setLastSynced(new Date());
      setNewUserId((prev) => (prev ? prev : u.length > 0 ? String(u[0].id) : ''));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [isActive, load]);

  async function handleRegister(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await registerCard({
        cardId: newCardId.trim(),
        userId: Number(newUserId),
        active: true,
      });
      setNewCardId('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(card) {
    setBusy(true);
    try {
      await setCardActive(card.id, !card.active);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const latestEntry = logs[0] ?? null;

  return (
    <div>
      <div className="panel live-feed-panel">
        <div className="live-feed-header">
          <h2>Live gate entries</h2>
          {lastSynced && (
            <span className="sync-hint">Updated {formatTime(lastSynced.toISOString())}</span>
          )}
        </div>
        <p>Every card read (approved or denied) is recorded here — same as the register at the gate.</p>
        {error && (
          <p className="error-text">
            Cannot load entries — is the backend running on port 4000? {error}
          </p>
        )}

        {latestEntry ? (
          <div
            className={`latest-entry ${latestEntry.status === 'GRANTED' ? 'granted' : 'denied'}`}
          >
            <span
              className={`badge ${latestEntry.status === 'GRANTED' ? 'granted' : 'denied'}`}
            >
              {latestEntry.status}
            </span>
            <strong style={{ marginLeft: '0.5rem' }}>
              {latestEntry.userName || 'Unknown'} — {latestEntry.cardId}
            </strong>
            <span style={{ color: 'var(--muted)', marginLeft: '0.5rem' }}>
              {latestEntry.gate} {latestEntry.direction} · {formatTime(latestEntry.timestamp)}
            </span>
            {latestEntry.passCode && (
              <span style={{ marginLeft: '0.5rem' }}>Pass: {latestEntry.passCode}</span>
            )}
            {latestEntry.reason && (
              <span style={{ color: 'var(--denied)', marginLeft: '0.5rem' }}>
                ({latestEntry.reason})
              </span>
            )}
          </div>
        ) : (
          !error && (
            <p className="empty-hint">No scans yet. Approve a card on the simulator — an entry will appear here.</p>
          )
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Users</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Registered cards</h2>
          <table>
            <thead>
              <tr>
                <th>Card ID</th>
                <th>Holder</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id}>
                  <td>{c.cardId}</td>
                  <td>{c.userName}</td>
                  <td>
                    <span className={`badge ${c.active ? 'active-yes' : 'active-no'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      disabled={busy}
                      onClick={() => toggleActive(c)}
                    >
                      {c.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: '1.25rem' }}>Register new card</h3>
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <div>
                <label htmlFor="newCardId">Card ID</label>
                <input
                  id="newCardId"
                  value={newCardId}
                  onChange={(e) => setNewCardId(e.target.value)}
                  placeholder="CARD-2001"
                  required
                />
              </div>
              <div>
                <label htmlFor="newUserId">Assign to user</label>
                <select
                  id="newUserId"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="primary" disabled={busy}>
              Register card
            </button>
          </form>
        </div>

        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Active exit passes</h2>
          <p>Approved hostel OUT scans — digital pass for main gate.</p>
          <table>
            <thead>
              <tr>
                <th>Pass</th>
                <th>Student</th>
                <th>Card</th>
                <th>Valid until</th>
              </tr>
            </thead>
            <tbody>
              {passes.length === 0 ? (
                <tr>
                  <td colSpan={4}>No active passes</td>
                </tr>
              ) : (
                passes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.passCode}</td>
                    <td>{p.userName}</td>
                    <td>{p.cardId}</td>
                    <td>{formatTime(p.validUntil)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>All access entries</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Gate</th>
                <th>Card</th>
                <th>User</th>
                <th>Result</th>
                <th>Pass</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7}>No entries yet</td>
                </tr>
              ) : (
                logs.map((l, index) => (
                  <tr key={l.id} className={index === 0 ? 'row-latest' : ''}>
                    <td>{formatTime(l.timestamp)}</td>
                    <td>
                      {l.gate} {l.direction}
                    </td>
                    <td>{l.cardId}</td>
                    <td>{l.userName || '—'}</td>
                    <td>
                      <span className={`badge ${l.status === 'GRANTED' ? 'granted' : 'denied'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>{l.passCode || '—'}</td>
                    <td>{l.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
