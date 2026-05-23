import { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import QRCode from 'qrcode';

export default function DropResult() {
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState('');
  const [status, setStatus] = useState(null); // 'waiting' | 'opened'

  const { id, exportedKey, expiresAt, hasPassword } = state || {};
  
  // Construct the full URL
  const clientUrl = window.location.origin;
  const baseUrl = id ? `${clientUrl}/drop/${id}` : '';
  const fullUrl = hasPassword ? baseUrl : `${baseUrl}#${exportedKey || ''}`;

  useEffect(() => {
    if (!fullUrl) return;

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
      setStatus(data.alive ? 'Waiting (still alive)' : 'Opened or expired');
    } catch {
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

  if (!state || !state.id) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container">
      <div className="card mt-5">
        
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <h2 className="glitch" data-text="Payload Generated" style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
            Payload Generated
          </h2>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: 0 }}>
            Your sensitive data has been encrypted and secured. Share the unique link or QR code below.
            <br/><strong className="annihilated-text">Do not lose this link</strong>—it cannot be recovered.
          </p>
        </div>
        
        <div className="form-group mt-4">
          <span className="label">Secure Access Link</span>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={fullUrl} 
              readOnly 
              onClick={selectAll}
              style={{ paddingRight: '90px' }}
            />
            <button 
              className="cta" 
              onClick={copyToClipboard} 
              style={{ 
                position: 'absolute', 
                right: '4px', 
                top: '4px', 
                bottom: '4px',
                width: 'auto',
                padding: '0 var(--space-3)',
                boxShadow: 'none',
                transform: 'none',
                height: 'calc(100% - 8px)'
              }}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)', alignItems: 'flex-start', marginTop: 'var(--space-4)' }}>
          {qrSrc && (
            <div style={{ flex: '1', minWidth: '150px' }}>
              <span className="label" style={{ marginBottom: 'var(--space-2)' }}>Scan Matrix</span>
              <div style={{ 
                padding: 'var(--space-2)', 
                border: 'var(--border-width) solid var(--text-color)', 
                background: 'white',
                maxWidth: '180px',
                boxShadow: '4px 4px 0 var(--text-color)'
              }}>
                <img src={qrSrc} alt="QR Code" style={{ display: 'block', width: '100%' }} />
              </div>
            </div>
          )}

          <div style={{ flex: '2', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <span className="label" style={{ marginBottom: 'var(--space-2)' }}>Payload Status</span>
              <div style={{ 
                padding: 'var(--space-3)', 
                border: 'var(--border-width) dashed var(--text-color)',
                fontFamily: 'var(--font-mono)'
              }}>
              <div>Expires in: <strong>{getTimeLeft()}</strong></div>
                <div className="mt-3">
                  <button className="secondary" onClick={checkStatus} style={{ width: '100%' }}>
                    Trace Payload
                  </button>
                </div>
                {status && <div className="mt-3" style={{ fontWeight: 'bold' }}>{status}</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="warning-banner mt-4" style={{ borderColor: '#ff3333', color: '#ff3333' }}>
          WARNING: Once read, this payload is permanently destroyed.
        </div>
        
        <div className="mt-4" style={{ textAlign: 'center' }}>
          <Link to="/" className="nav-link" style={{ fontSize: '0.875rem' }}>Encrypt New Payload</Link>
        </div>

      </div>
    </div>
  );
}
