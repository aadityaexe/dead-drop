import React from 'react';

export default function AboutCreator() {
  return (
    <section id="about" className="about-section">
      <h2>Zero-trust protocol.</h2>
      <p>
        Engineered for absolute privacy. This application demonstrates pure client-side encryption using the native <strong>Web Crypto API</strong>. 
      </p>
      <p>
        The AES-256-GCM encryption key is generated exclusively in your browser and embedded in the URL fragment. Our servers receive only ciphertext, making it mathematically impossible for us to recover your payload.
      </p>
    </section>
  );
}
