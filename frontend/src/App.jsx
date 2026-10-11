import { useState } from 'react';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CardSimulator from './pages/CardSimulator.jsx';

export default function App() {
  const [tab, setTab] = useState('simulator');
  const [logRefresh, setLogRefresh] = useState(0);

  function handleScanComplete() {
    setLogRefresh((n) => n + 1);
  }

  return (
    <div className="app-shell">
      <header className="header">
        <h1>Campus Flow</h1>
        <p>Campus In-Out Management — software layer (MVP)</p>
      </header>

      <nav className="tabs" aria-label="Main">
        <button
          type="button"
          className={`tab ${tab === 'simulator' ? 'active' : ''}`}
          onClick={() => setTab('simulator')}
        >
          Card simulator
        </button>
        <button
          type="button"
          className={`tab ${tab === 'admin' ? 'active' : ''}`}
          onClick={() => setTab('admin')}
        >
          Admin portal
        </button>
      </nav>

      <div hidden={tab !== 'simulator'}>
        <CardSimulator onScanComplete={handleScanComplete} />
      </div>

      {/* Always mounted so scans update the portal even before you open the tab */}
      <div hidden={tab !== 'admin'}>
        <AdminDashboard refreshToken={logRefresh} isActive={tab === 'admin'} />
      </div>
    </div>
  );
}
