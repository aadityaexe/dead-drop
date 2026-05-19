# Dead Drop Client

This is the React/Vite frontend for Dead Drop. It handles all plaintext operations: users create drops, the browser encrypts payloads, recipients decrypt payloads locally, and the UI displays status, stats, links, and QR codes.

The server should only ever receive encrypted data and metadata.

## Responsibilities

- Generate AES-GCM keys for fragment-based links.
- Derive password-based AES-GCM keys with PBKDF2.
- Encrypt and decrypt payload text with the Web Crypto API.
- Create share links and QR codes.
- Read and decrypt drops from `/api/drop/:id`.
- Check drop status through `/api/drop/:id/status`.
- Apply display deterrents such as blur-on-unfocus and shortcut blocking.

## Setup

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

## Environment

For local development, API calls are relative `/api/...` requests. Vite proxies those requests to the backend configured in `vite.config.js`.

Optional `.env`:

```env
VITE_API_PROXY=http://localhost:3001
VITE_API_URL=
```

Use `VITE_API_PROXY` while running Vite locally. Use `VITE_API_URL` only when the frontend build needs to call an API hosted on another origin.

## Routes

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `CreateDrop` | Compose, encrypt, and create a new drop |
| `/drop/created` | `DropResult` | Show the generated link, QR code, expiry, and status check |
| `/drop/:id` | `ReadDrop` | Fetch encrypted data, decrypt locally, and show the payload |

## Crypto Helpers

`src/utils/crypto.js` contains the browser crypto surface:

- `generateKey()` creates an extractable AES-256-GCM key.
- `exportKey()` converts a raw AES key to Base64 for URL fragments.
- `importKey()` imports a Base64 fragment key for decryption.
- `deriveKeyFromPassword()` derives an AES-GCM key with PBKDF2.
- `encryptMessage()` encrypts UTF-8 text and returns Base64 ciphertext and IV.
- `decryptMessage()` decrypts Base64 ciphertext back to text.

## Scripts

```bash
npm run dev      # Start Vite with HMR
npm run build    # Build production assets
npm run lint     # Run ESLint
npm run preview  # Serve the production build locally
```

## Development Notes

- Keep plaintext handling inside the browser.
- Do not log payload text, keys, passwords, ciphertext, IVs, or salts.
- URL fragment keys are intentionally read from `location.hash`; fragments are not sent to the API.
- Password-protected links intentionally omit the URL fragment key.
- Any new API call should use `import.meta.env.VITE_API_URL || ''` so local proxying keeps working.
