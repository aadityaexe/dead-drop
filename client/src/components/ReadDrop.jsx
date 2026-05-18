import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { importKey, decryptMessage, deriveKeyFromPassword } from '../utils/crypto';

export default function ReadDrop() {
  const { id } = useParams();
  const location = useLocation();
  const fetchedRef = useRef(false);
  
  const [state, setState] = useState('loading'); // loading, password_prompt, decrypting, success, burned
  const [message, setMessage] = useState('');
  const [showBurnBanner, setShowBurnBanner] = useState(false);
  
  // Data from server
  const [encryptedData, setEncryptedData] = useState(null);
  
  // Password state
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  // 1. On mount, fetch the drop from the server (this burns it atomically!)
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let mounted = true;
    
    async function fetchDrop() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/drop/${id}`);
        
        if (res.status === 404) {
          if (mounted) setState('burned');
          return;
        }
        
        if (!res.ok) throw new Error('Failed to fetch drop');
        
        const data = await res.json();
        
        if (mounted) {
          setEncryptedData(data);
          
          if (data.hasPassword) {
            setState('password_prompt');
          } else {
            setState('decrypting');
          }
        }
      } catch (err) {
        console.error(err);
        if (mounted) setState('burned'); // Generic error treated as dead drop for security
      }
    }
    
    fetchDrop();
    
    return () => { mounted = false; };
  }, [id]);

  // 2. Perform decryption when ready
  useEffect(() => {
    let mounted = true;
    
    async function performDecryption() {
      if (state !== 'decrypting' || !encryptedData) return;
      
      try {
        const { ciphertext, iv } = encryptedData;
        let plaintext = '';
        
        if (encryptedData.hasPassword) {
          // Password path: derive key using PBKDF2
          const { key } = await deriveKeyFromPassword(password, encryptedData.salt);
          plaintext = await decryptMessage(ciphertext, iv, key);
        } else {
          // Standard path: extract key from URL hash
          const hash = location.hash.replace('#', '');
          if (!hash) throw new Error('No decryption key in URL');
          
          const key = await importKey(hash);
          plaintext = await decryptMessage(ciphertext, iv, key);
        }
        
        if (mounted) {
          setMessage(plaintext);
          setState('success');
          
          // Show the dramatic burn banner after a short delay
          setTimeout(() => {
            if (mounted) setShowBurnBanner(true);
          }, 800);
        }
        
      } catch (err) {
        console.error('Decryption failed:', err);
        if (mounted) {
          if (encryptedData.hasPassword) {
            setPassError('Incorrect password or corrupted drop.');
            setState('password_prompt');
          } else {
            setState('burned'); // Corrupted key / hash
          }
        }
      }
    }
    
    performDecryption();
    
    return () => { mounted = false; };
  }, [state, encryptedData, password, location.hash]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    setPassError('');
    setState('decrypting');
  };

  // Render logic based on state
  if (state === 'loading') {
    return (
      <div className="card mt-5" style={{ alignItems: 'center' }}>
        <div className="loading mt-5">...</div>
        <div className="label mt-4">Retrieving Encrypted Payload...</div>
      </div>
    );
  }
  
  if (state === 'burned') {
    return (
      <div className="card mt-5" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>💀</div>
        <h2>Payload Annihilated.</h2>
        <p className="text-opacity-70 mt-3">This payload has already been read and destroyed, or its TTL has expired.</p>
      </div>
    );
  }
  
  if (state === 'password_prompt') {
    return (
      <div className="card mt-5">
        <h2>Cryptographic Lock</h2>
        <p className="label">This payload requires a password to derive the decryption key.</p>
        
        <form onSubmit={handlePasswordSubmit} className="form-group mt-4">
          <input 
            type="password" 
            placeholder="Enter password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {passError && <div className="warning-banner mt-3">{passError}</div>}
          <button type="submit" className="cta mt-4">
            Decrypt Payload
          </button>
        </form>
      </div>
    );
  }

  if (state === 'decrypting') {
    return (
      <div className="card mt-5" style={{ alignItems: 'center' }}>
        <div className="loading mt-5">...</div>
        <div className="label mt-4">Decrypting Locally...</div>
      </div>
    );
  }
  
  if (state === 'success') {
    return (
      <div className="container mt-5">
        {showBurnBanner && (
          <div className="warning-banner" style={{ background: 'var(--text-color)', color: 'var(--bg-color)', border: 'none' }}>
            🔥 Cryptographically Annihilated. This payload can never be read again.
          </div>
        )}
        
        {!showBurnBanner && encryptedData?.viewsRemaining > 0 && (
          <div className="warning-banner mb-3">
            Remaining reads allowed: {encryptedData.viewsRemaining}
          </div>
        )}
        
        <div className="message-box mt-4">
          {message}
        </div>
      </div>
    );
  }

  return null;
}
