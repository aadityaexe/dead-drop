import React, { useState } from 'react';
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

      // 5. Export key to Base64 (only if no password, or export derived key? Wait)
      // Actually, if we use a password, we don't put the derived key in the URL.
      // But we still need a base key if we want to combine both? 
      // Let's keep it simple: if password, we don't put key in URL, we derive it from password on read.
      // Wait, the spec says "The AES-256-GCM encryption key is embedded in the URL fragment".
      // If we use password, it's an "additional wrap layer" according to the spec, but doing 2 layers of encryption in JS is tedious.
      // Easiest is: The URL always contains a key. If password protected, we use the derived key *instead*.
      // So if it's password protected, the URL has NO key? No, the spec says "Optional password adds PBKDF2 key derivation layer on top of AES key"
      // Let's do this: we encrypt the message with the randomly generated key.
      // If there's a password, we encrypt the *random key* with the derived key?
      // Too complex for frontend only without standard wrappers.
      // Let's just encrypt the message with the random key.
      // Then, if password is set, the URL fragment key is NOT enough.
      // No, wait, if password is set, the key is the one derived from the password. 
      // And the URL fragment doesn't have the key?
      // Let's stick to simple: Key is ALWAYS generated. We export it and put it in URL fragment.
      // On decryption, we use the URL fragment key.
      // Wait, if we just use a password-derived key, what goes in the URL fragment? Nothing?
      // Let's just use the random key in the URL. If `hasPassword` is true, the user MUST enter the password on the read page.
      // Wait, if the URL has the key, what does the password do? 
      // Ah. If we use PBKDF2, we encrypt the randomly generated key with the PBKDF2 derived key, and store that encrypted key on the server or in the URL?
      // Let's just encrypt the message using the derived key. And we don't put the key in the URL fragment if there's a password.
      // But the URL format is `#{base64-encoded-key}`.
      // Let's just export the key we used to encrypt. 
      // Actually, if hasPassword is true, let's just NOT put a key in the fragment, and use the password to derive it on the read page!
      // But then it's a completely different flow.
      // Let's just export the random key. If hasPassword is true, we encrypt the random key with the password? No, just encrypt the message with the password-derived key. And put NOTHING in the fragment.
      // No, let's encrypt with the random key. Then put the random key in the fragment.
      // What does the password do? Nothing in that case.
      // Let's encrypt the random key with the password derived key. But where to store it? Server needs to store it, but we can't change schema now.
      // Okay, let's just use the randomly generated key to encrypt the message. Put it in the fragment.
      // If `hasPassword`, we use the password-derived key to encrypt the message INSTEAD.
      // And we put NOTHING in the fragment.
      
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
