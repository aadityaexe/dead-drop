# Dead Drop

> Write it. Share it. It vanishes.

A zero-knowledge, one-time secret sharing web application. 
No accounts. No logs. No plaintext ever stored on the server.

## Security Architecture

The core of Dead Drop is built around the URL fragment (`#key`). Browsers **never** send the fragment to the server.

1. Message is encrypted in the browser using the Web Crypto API (`AES-256-GCM`).
2. Only the `ciphertext` and `iv` are sent to the server.
3. The encryption key is appended to the URL fragment (`#key`).
4. When the recipient opens the link, the browser extracts the key, downloads the encrypted blob (which is automatically and atomically deleted by the server), and decrypts the message locally.

Even if the database is compromised, the plaintext is cryptographically unrecoverable.

## Tech Stack
- Frontend: React 18, Vite
- Backend: Express.js, MongoDB (Mongoose)
- Encryption: Native Web Crypto API
- Styling: Custom Vanilla CSS (Dark Terminal Aesthetic)

## Running Locally

### Prerequisites
- Node.js (v16+)
- MongoDB running on `localhost:27017`

### Backend
```bash
cd server
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```
