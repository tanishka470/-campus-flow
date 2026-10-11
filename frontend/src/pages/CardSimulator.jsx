import { useState } from 'react';
import { scanCard } from '../api.js';

const DEMO_CHIPS = [
  { id: 'CARD-1001', hint: 'Active student card' },
  { id: 'CARD-1002', hint: 'Inactive card' },
  { id: 'UNKNOWN-CARD', hint: 'Not registered' },
];

const FLOW_STEPS = [
  { gate: 'HOSTEL', direction: 'OUT', label: '1. Hostel OUT (get pass)' },
  { gate: 'MAIN', direction: 'OUT', label: '2. Main OUT (leave campus)' },
  { gate: 'MAIN', direction: 'IN', label: '3. Main IN (return)' },
  { gate: 'HOSTEL', direction: 'IN', label: '4. Hostel IN (close pass)' },
];

export default function CardSimulator({ onScanComplete }) {
  const [cardId, setCardId] = useState('CARD-1001');
  const [gate, setGate] = useState('HOSTEL');
  const [direction, setDirection] = useState('OUT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleScan(id = cardId, opts = {}) {
    const g = opts.gate ?? gate;
    const d = opts.direction ?? direction;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await scanCard(id.trim(), { gate: g, direction: d });
      setResult(data);
      setGate(g);
      setDirection(d);
      onScanComplete?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="panel">
        <h2>Card reader simulator</h2>
        <p>
          Each physical reader is configured with a <strong>gate</strong> (HOSTEL or MAIN) and knows
          if the student is entering or exiting. It still sends only <strong>cardId</strong> plus
          those two fields — same as <code>POST /api/access/scan</code>.
        </p>
        <pre className="flow-diagram">{`Manual today                 Automated MVP
Hostel: register + paper pass  →  HOSTEL OUT scan → digital PASS-xxx
Main: show pass to guard       →  MAIN OUT scan → must have active pass
Return main + hostel           →  MAIN IN, then HOSTEL IN closes pass`}</pre>

        <label htmlFor="cardId">Card ID</label>
        <input
          id="cardId"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          placeholder="e.g. CARD-1001"
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
        />

        <div className="form-row">
          <div>
            <label htmlFor="gate">Gate (reader location)</label>
            <select id="gate" value={gate} onChange={(e) => setGate(e.target.value)}>
              <option value="HOSTEL">Hostel gate</option>
              <option value="MAIN">Main gate</option>
            </select>
          </div>
          <div>
            <label htmlFor="direction">Direction</label>
            <select
              id="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="OUT">OUT (exit)</option>
              <option value="IN">IN (entry)</option>
            </select>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>End-to-end demo sequence:</p>
        <div className="chip-row">
          {FLOW_STEPS.map((step) => (
            <button
              type="button"
              key={step.label}
              className="chip"
              onClick={() => handleScan(cardId, { gate: step.gate, direction: step.direction })}
            >
              {step.label}
            </button>
          ))}
        </div>

        <div className="chip-row">
          {DEMO_CHIPS.map((c) => (
            <button
              type="button"
              key={c.id}
              className="chip"
              title={c.hint}
              onClick={() => {
                setCardId(c.id);
              }}
            >
              {c.id}
            </button>
          ))}
        </div>

        <button type="button" className="primary" disabled={loading} onClick={() => handleScan()}>
          {loading ? 'Scanning…' : 'Simulate scan'}
        </button>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <div className={`result-box ${result.status === 'GRANTED' ? 'granted' : 'denied'}`}>
            <span className={`badge ${result.status === 'GRANTED' ? 'granted' : 'denied'}`}>
              {result.status}
            </span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text)' }}>
              {result.gate} · {result.direction} · {result.cardId}
            </p>
            {result.reason && (
              <p style={{ marginTop: '0.25rem', color: 'var(--muted)' }}>Reason: {result.reason}</p>
            )}
            {result.user && (
              <p style={{ marginTop: '0.5rem', color: 'var(--text)' }}>
                User: {result.user.name} ({result.user.department})
              </p>
            )}
            {result.pass && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  borderRadius: 8,
                }}
              >
                <strong>Digital exit pass</strong> (proof for main gate / display)
                <p style={{ color: 'var(--text)', marginTop: '0.35rem' }}>
                  Code: <code>{result.pass.passCode}</code>
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Valid until: {new Date(result.pass.validUntil).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
