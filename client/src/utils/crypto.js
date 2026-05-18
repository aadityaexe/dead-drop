/**
 * Core Web Crypto API utility for Dead Drop.
 * 100% native browser crypto. No third-party dependencies.
 */

// Generate a random AES-256-GCM key
export async function generateKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable (so we can put it in the URL fragment)
    ["encrypt", "decrypt"]
  );
}

// Export CryptoKey to Base64 (for the URL fragment)
export async function exportKey(key) {
  const raw = await window.crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

// Import Base64 string to CryptoKey
export async function importKey(base64Key) {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    "raw", raw, { name: "AES-GCM" }, false, ["decrypt"]
  );
}

// Derive a wrap key from a password using PBKDF2
export async function deriveKeyFromPassword(password, saltB64) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = saltB64 
    ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
    : window.crypto.getRandomValues(new Uint8Array(16));

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return { 
    key, 
    saltB64: btoa(String.fromCharCode(...salt)) 
  };
}

// Encrypt a string message using AES-GCM
export async function encryptMessage(message, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt a Base64 ciphertext back to string
export async function decryptMessage(ciphertextB64, ivB64, key) {
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}
