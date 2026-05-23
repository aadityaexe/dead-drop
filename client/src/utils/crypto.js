/**
 * Core Web Crypto API utility for Dead Drop.
 * 100% native browser crypto. No third-party dependencies.
 */

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

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
  return bytesToBase64(new Uint8Array(raw));
}

// Import Base64 string to CryptoKey
export async function importKey(base64Key) {
  const raw = base64ToBytes(base64Key);
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
    ? base64ToBytes(saltB64)
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
    saltB64: bytesToBase64(salt) 
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
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

// Decrypt a Base64 ciphertext back to string
export async function decryptMessage(ciphertextB64, ivB64, key) {
  const ciphertext = base64ToBytes(ciphertextB64);
  const iv = base64ToBytes(ivB64);
  
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decryptedBuffer);
}
