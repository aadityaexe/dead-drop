import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';

export default function DropResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [status, setStatus] = useState(null); // 'waiting' | 'opened'

  // Redirect if accessed directly without creating a drop
  if (!state || !state.id) {
    navigate('/');
    return null;
  }

  const { id, exportedKey, expiresAt, hasPassword } = state;
  
  // Construct the full URL
  const clientUrl = window.location.origin;
  const baseUrl = `${clientUrl}/drop/${id}`;
  const fullUrl = hasPassword ? baseUrl : `${baseUrl}#${exportedKey}`;

  useEffect(() => {
    // Generate QR code
    QRCode.toDataURL(fullUrl, {
      width: 128,
      margin: 2,
      color: {
        dark: '#F5F5F5',
        light: '#111111'
      }
    }).then(setQrSrc).catch(console.error);
  }, [fullUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const checkStatus = async () => {
    try {
      setStatus('checking...');
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drop/${id}/status`);
      const data = await res.json();
      setStatus(data.alive ? '● waiting (still alive)' : '✓ opened (burned)');
    } catch (err) {
      setStatus('error checking status');
    }
  };

  const selectAll = (e) => {
    e.target.select();
  };

  // Simple countdown formatting
  const getTimeLeft = () => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return 'Expired';
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  return (
    <div className="card mt-5">
      <h2>Payload Generated</h2>
      
      <div className="form-group mt-5">
        <span className="label">Access Link</span>
        <input 
          type="text" 
          value={fullUrl} 
          readOnly 
          onClick={selectAll}
        />
      </div>

      <div className="form-group mt-3" style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
        <button className="cta" onClick={copyToClipboard} style={{ maxWidth: '200px' }}>
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>

      {qrSrc && (
        <div className="mt-4" style={{ 
          padding: 'var(--space-3)', 
          border: 'var(--border-width) solid var(--text-color)', 
          background: 'white',
          maxWidth: '250px',
          margin: 'var(--space-4) auto 0'
        }}>
          <img src={qrSrc} alt="QR Code" style={{ display: 'block', width: '100%' }} />
        </div>
      )}

      <div className="label mt-4">
        ⏱ Expires in {getTimeLeft()}
      </div>

      <div className="form-group mt-4" style={{ textAlign: 'center' }}>
        <button className="secondary" onClick={checkStatus}>
          Trace Payload
        </button>
        {status && <div className="label mt-3">{status}</div>}
      </div>

      <div className="warning-banner mt-4">
        ⚠ Once read, this payload is permanently destroyed.
      </div>
      
      <div className="mt-5">
        <Link to="/" className="label">← Encrypt New Payload</Link>
      </div>
    </div>
  );
}
