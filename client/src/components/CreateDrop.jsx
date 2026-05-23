import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateKey, exportKey, encryptMessage, deriveKeyFromPassword } from '../utils/crypto';
import StatusCheck from './StatusCheck';
import StatsDashboard from './StatsDashboard';
import Hero from './Hero';
import AboutCreator from './AboutCreator';

const EXPIRY_OPTIONS = [
  { value: 'burn_after_read', label: 'Burn after read' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
];

const MAX_VIEWS_OPTIONS = [1, 3, 5];

export default function CreateDrop() {
  const navigate = useNavigate();
  
  const [message, setMessage] = useState('');
  const [expiryOption, setExpiryOption] = useState('burn_after_read');
  const [maxViews, setMaxViews] = useState(1);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Generate base AES key
      let key = await generateKey();
      let saltB64 = null;

      // 2. If password-protected, derive a new key from password + salt
      if (hasPassword && password) {
        const derived = await deriveKeyFromPassword(password);
        key = derived.key;
        saltB64 = derived.saltB64;
      }

      // 3. Encrypt message in browser
      const { ciphertext, iv } = await encryptMessage(message, key);

      // 4. Send ONLY ciphertext to server
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ciphertext,
          iv,
          salt: saltB64,
          hasPassword,
          maxViews,
          expiryOption
        })
      });

      if (!res.ok) throw new Error('Failed to create drop on server.');

      const { id, expiresAt } = await res.json();

      let exportedKey = '';
      if (!hasPassword) {
        exportedKey = await exportKey(key);
      }

      // Navigate to success page, passing data via state
      navigate('/drop/created', {
        state: {
          id,
          exportedKey,
          expiresAt,
          hasPassword
        }
      });

    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="main-content">
      {/* Hero Section */}
      <Hero />

      {/* Main Content (Create Drop Form) */}
      <div className="container" >
        <form onSubmit={handleSubmit} className="card">
          
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Encrypt Payload</h2>
            <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: 0 }}>
              Type or paste your sensitive data below. The content will be encrypted in your browser. 
              We cannot see your data, and it will be destroyed automatically based on your settings.
            </p>
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <textarea
              placeholder="Enter plaintext payload..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="character-count">{message.length} chars</div>
          </div>

          <div className="form-group">
            <span className="label">Time to Live (TTL)</span>
            <div className="pill-group">
              {EXPIRY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`pill ${expiryOption === opt.value ? 'active' : ''}`}
                  onClick={() => setExpiryOption(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {expiryOption !== 'burn_after_read' && (
            <div className="form-group">
              <span className="label">Maximum Reads</span>
              <div className="pill-group">
                {MAX_VIEWS_OPTIONS.map(val => (
                  <button
                    key={val}
                    type="button"
                    className={`pill ${maxViews === val ? 'active' : ''}`}
                    onClick={() => setMaxViews(val)}
                  >
                    {val} {val === 1 ? 'view' : 'views'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-group">
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => {
                  setHasPassword(e.target.checked);
                  if (!e.target.checked) setPassword('');
                }}
              />
              <span className="label checkbox-label">Cryptographic Lock (Optional Password)</span>
            </label>
            
            {hasPassword && (
              <div className="password-input">
                <input
                  type="password"
                  placeholder="Enter a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={hasPassword}
                  autoComplete="new-password"
                />
              </div>
            )}
          </div>

          {error && <div className="warning-banner">{error}</div>}

          <button type="submit" className="cta" disabled={isSubmitting || !message.trim()}>
            {isSubmitting ? 'Encrypting locally...' : 'Encrypt & Generate Link'}
          </button>
        </form>
      </div>

      {/* Status Check Section */}
      <section id="status" className="container">
        <StatusCheck />
      </section>

      {/* Stats Section */}
      <section id="stats" className="container">
        <StatsDashboard />
      </section>

      {/* About Creator Section */}
      <AboutCreator />
    </main>
  );
}
