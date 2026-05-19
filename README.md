# Dead Drop

Dead Drop is a zero-knowledge secret-sharing web app for sending sensitive text, such as credentials, API keys, recovery codes, and one-time notes. Payloads are encrypted in the browser before they touch the network, and the server stores only ciphertext plus the metadata needed to expire or burn the drop.

The backend never receives a plaintext secret or a URL fragment decryption key. When a recipient opens a drop, the frontend fetches the encrypted payload, decrypts it locally, and the server either records the read or deletes the document once its view limit is reached.

## What It Does

- Encrypts payloads in the browser with the native Web Crypto API.
- Stores opaque ciphertext in MongoDB through an Express API.
- Supports burn-after-read links and limited multi-read drops.
- Supports optional password-based encryption using PBKDF2 and AES-GCM.
- Expires unread drops automatically through a MongoDB TTL index.
- Generates shareable links and QR codes for newly created drops.
- Provides non-destructive status checks for existing drop IDs or URLs.
- Adds client-side display deterrents such as blur-on-unfocus, shortcut blocking, and disabled context menus.

## Security Model

Dead Drop is designed so the server does not have enough information to decrypt stored payloads.

### Link-Key Flow

1. The browser generates a 256-bit AES-GCM key.
2. The payload is encrypted locally with a random IV.
3. The frontend sends only `ciphertext`, `iv`, expiry settings, and view settings to the backend.
4. The raw AES key is exported as Base64 and placed in the URL fragment: `/drop/:id#base64-key`.
5. URL fragments are not sent in HTTP requests, so the backend receives only `/drop/:id`.
6. The recipient's browser imports the fragment key and decrypts the payload locally.

### Password Flow

1. The browser derives an AES-GCM key from the password with PBKDF2.
2. PBKDF2 uses SHA-256, 100,000 iterations, and a random salt.
3. The payload is encrypted locally with the derived key.
4. The frontend sends `ciphertext`, `iv`, `salt`, and `hasPassword: true` to the backend.
5. The share URL does not include a fragment key.
6. The recipient must enter the password to derive the same key and decrypt the payload.

### Important Limits

Client-side capture deterrents are not a substitute for trust. Browser restrictions can discourage casual copying, but they cannot stop a determined recipient from using another device, a modified browser, an operating-system tool, or hardware capture.

Multi-read drops are limited by the server's view counter and are intended for small trusted groups. Single-read drops use an atomic delete on the final read path.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, React Router |
| Styling | CSS, Tailwind/PostCSS tooling |
| Motion/UI | Framer Motion, QRCode |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Crypto | Browser Web Crypto API |
| Deployment | Vercel configs for client and server |

## Project Structure

```text
dead-drop/
|-- client/                 # React/Vite frontend
|   |-- public/             # PWA, SEO, and icon assets
|   |-- src/
|   |   |-- components/     # Create, read, status, stats, and layout UI
|   |   |-- utils/crypto.js # AES-GCM and PBKDF2 helpers
|   |   |-- App.jsx         # Routes and display-protection behavior
|   |   `-- index.css       # Global styles and design tokens
|   |-- package.json
|   `-- vite.config.js      # Local /api proxy configuration
|-- server/                 # Express API
|   |-- middleware/         # Security headers and rate limiter
|   |-- models/Drop.js      # Drop schema and TTL index
|   |-- routes/drops.js     # Create, read, and status endpoints
|   |-- utils/stats.js      # In-memory telemetry counters
|   |-- index.js            # App setup, DB connection, exports
|   `-- package.json
`-- README.md
```

## Local Development

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB, either local or Atlas

### Install

```bash
cd client
npm install

cd ../server
npm install
```

### Configure Environment

Create `server/.env`:

```env
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/dead-drop
```

Optional `client/.env` for local development:

```env
VITE_API_PROXY=http://localhost:3001
```

Optional `client/.env` for a separately hosted API:

```env
VITE_API_URL=https://your-api.example.com
```

When `VITE_API_URL` is empty, frontend requests use relative `/api/...` paths. During Vite development, those requests are proxied to `VITE_API_PROXY` or `http://localhost:3001`.

### Run

Start the API:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## API Reference

Base path: `/api`

### `POST /drop`

Creates a drop.

Request body:

```json
{
  "ciphertext": "base64-ciphertext",
  "iv": "base64-iv",
  "salt": "base64-salt-or-null",
  "hasPassword": false,
  "maxViews": 1,
  "expiryOption": "burn_after_read"
}
```

Accepted `expiryOption` values:

| Value | Expiry |
| --- | --- |
| `burn_after_read` | 24 hours maximum, deleted sooner when read |
| `1h` | 1 hour |
| `24h` | 24 hours |
| `7d` | 7 days |

Accepted `maxViews` values are `1`, `3`, and `5`. Invalid values fall back to `1`.

Response:

```json
{
  "id": "drop-id",
  "expiresAt": "2026-05-19T12:00:00.000Z"
}
```

### `GET /drop/:id`

Fetches encrypted drop data. This is destructive once the drop reaches its view limit.

Response for a final read:

```json
{
  "ciphertext": "base64-ciphertext",
  "iv": "base64-iv",
  "salt": null,
  "hasPassword": false,
  "burned": true
}
```

Response for a multi-read drop with reads remaining:

```json
{
  "ciphertext": "base64-ciphertext",
  "iv": "base64-iv",
  "salt": null,
  "hasPassword": false,
  "burned": false,
  "viewsRemaining": 2
}
```

### `GET /drop/:id/status`

Checks whether a drop still exists without fetching or burning it.

```json
{
  "alive": true,
  "expiresAt": "2026-05-19T12:00:00.000Z"
}
```

### `GET /stats`

Returns lightweight in-memory counters.

```json
{
  "totalDropsCreated": 42,
  "totalBurnedToday": 7
}
```

### `GET /health`

Returns basic API health.

```json
{
  "status": "ok",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

## Operational Notes

- API routes are rate-limited to 100 requests per 15 minutes per IP.
- Request bodies are limited to 1 MB.
- MongoDB deletes expired documents through the `expiresAt` TTL index.
- Stats are in-memory counters initialized from the current drop count on server startup. They are useful for display, not durable analytics.
- The backend accepts both `MONGODB_URI` and `MONGO_URI`, with `MONGODB_URI` preferred.

## Deployment

The repository includes Vercel configuration for both app surfaces:

- `client/vercel.json` for the Vite frontend.
- `server/vercel.json` for the Express API.

For production, set `MONGODB_URI` in the server environment. If the frontend and backend are deployed to different origins, set `VITE_API_URL` for the frontend build so API calls target the deployed backend.

## Scripts

Frontend:

```bash
cd client
npm run dev
npm run build
npm run lint
npm run preview
```

Backend:

```bash
cd server
npm run dev
npm start
```

## License

No license file is currently included. Add one before distributing or accepting external contributions.
