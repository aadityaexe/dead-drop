import React, { useState, useEffect } from 'react';

export default function StatsDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/stats`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(true);
      }
    }
    
    fetchStats();
    
    // Refresh every 60 seconds to respect rate limits
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card">
      <h2>Network Telemetry</h2>
      <p className="label">Anonymized cryptographic payload statistics.</p>
      
      {error && <div className="warning-banner">Could not load stats</div>}
      
      {!stats && !error && <div className="loading mt-5">...</div>}
      
      {stats && (
        <div className="stats-grid">
          
          <div className="stat-card">
            <div className="stat-value">
              {stats.totalDropsCreated.toLocaleString()}
            </div>
            <div className="label">
              Payloads Encrypted (All Time)
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {stats.totalBurnedToday.toLocaleString()}
            </div>
            <div className="label text-opacity-70">
              Payloads Annihilated (Today)
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
