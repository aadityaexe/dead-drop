import React, { useState } from 'react';

export default function StatusCheck() {
  const [id, setId] = useState('');
  const [status, setStatus] = useState(null); // null | 'checking' | { alive, expiresAt }
  const [error, setError] = useState('');

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!id.trim()) return;

    setStatus('checking');
    setError('');

    // Extract ID if user pasted full URL
    let cleanId = id.trim();
    if (cleanId.includes('/drop/')) {
      cleanId = cleanId.split('/drop/')[1].split('#')[0];
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drop/${cleanId}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError('Could not verify status. Make sure the ID is correct.');
      setStatus(null);
    }
  };

  return (
    <div className="card">
      <h2>Trace Payload</h2>
      <p className="label">Verify cryptographic integrity without decrypting the payload.</p>
      
      <form onSubmit={handleCheck} className="status-form">
        <input 
          type="text" 
          placeholder="Enter payload identifier or URL" 
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        
        {error && <div className="warning-banner mt-3">{error}</div>}
        
        <button type="submit" className="cta mt-3" disabled={!id.trim() || status === 'checking'}>
          {status === 'checking' ? '...' : 'Verify Status'}
        </button>
      </form>

      {status && status !== 'checking' && (
        <div className="status-result">
          {status.alive ? (
            <>
              <div className="status-message intact">
                ● Payload Intact
              </div>
              <div className="label mt-2">
                TTL expires: {new Date(status.expiresAt).toLocaleString()}
              </div>
            </>
          ) : (
            <>
              <div className="status-message annihilated">
                ✗ Cryptographically Annihilated
              </div>
              <div className="label mt-2">
                This payload no longer exists on any server.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
