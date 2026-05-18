# ☠️ Dead Drop

> A zero-knowledge protocol for sharing unrecoverable secrets. 

Dead Drop is an ultra-secure, client-side encrypted web application designed for sharing highly sensitive information (API keys, passwords, credentials). It ensures that secrets are cryptographically annihilated the moment they are read. 

Your message is encrypted locally. The decryption key never leaves your device and is never sent to the server. Once the payload is fetched and decrypted, the database destroys it permanently. 

---

## ✨ Core Features

- **Zero-Knowledge Architecture**: Encryption and decryption happen entirely in the browser using the native Web Crypto API (AES-GCM). The server only stores opaque ciphertexts.
- **Burn-After-Reading**: Payloads are atomically deleted from the database upon the first successful read request.
- **Time-to-Live (TTL)**: Secrets automatically expire and are purged via MongoDB TTL indexes if they are not read within a specified time window.
- **Anti-Screenshot & Anti-Recording**: Aggressive client-side deterrents black out the screen if the window loses focus (preventing tools like Snipping Tool) and block standard clipboard/screenshot shortcuts.
- **Hostile to Debugging**: Developer tools, right-clicking, and text selection are heavily restricted on the client to prevent easy data exfiltration.
- **Brutalist UI**: A premium, responsive, two-color brutalist design system featuring a dynamic dark/light mode toggle.
- **QR Code Generation**: Easily scan links securely to a mobile device. 

---

## 🔒 Security Architecture Deep Dive

Dead Drop achieves a "Zero-Knowledge" state by ensuring the backend never has enough information to decrypt a payload.

### The Standard Flow (No Password)
1. **Key Generation**: The browser generates a 256-bit AES-GCM symmetric key using `window.crypto.subtle`.
2. **Encryption**: The plaintext payload is encrypted using the key and a randomized Initialization Vector (IV).
3. **Storage**: The `ciphertext` and `iv` are sent to the server.
4. **URL Generation**: The raw cryptographic key is exported as a JWK (JSON Web Key) and appended to the URL as a hash fragment (e.g., `https://domain.com/drop/ID#JWK_KEY`). 
5. **Decryption**: Hash fragments (`#`) are evaluated strictly locally by the browser and are **never** sent in HTTP requests. When the recipient opens the link, the frontend extracts the key from the URL and decrypts the payload locally.

### The Password Flow (PBKDF2)
If a user chooses to lock the drop with a password:
1. A random cryptographic `salt` is generated.
2. The user's plaintext password undergoes key derivation using **PBKDF2** (100,000 iterations, SHA-256) to generate a strong 256-bit AES-GCM key.
3. The payload is encrypted with this derived key.
4. The `salt`, `iv`, and `ciphertext` are sent to the server.
5. The URL does **not** contain a hash fragment.
6. The recipient must enter the exact password to recreate the PBKDF2 key and decrypt the payload.

---

## 🛠️ Tech Stack & Project Structure

- **Frontend**: React (Vite), React Router, Vanilla CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Cryptography**: Web Crypto API (AES-256-GCM, PBKDF2)

### Directory Structure
```text
dead-drop/
├── client/                 # Frontend React Application (Vite)
│   ├── src/
│   │   ├── components/     # React UI Components (Hero, Navbar, CreateDrop, etc.)
│   │   ├── utils/          # Cryptography helpers (crypto.js)
│   │   ├── App.jsx         # Main routing and security overlay logic
│   │   └── index.css       # Brutalist design system and CSS variables
│   └── .env                # Frontend environment variables
├── server/                 # Backend Node.js/Express API
│   ├── models/             # Mongoose schemas (Drop, GlobalStats)
│   ├── index.js            # Express server and API routes
│   ├── vercel.json         # Vercel deployment configuration
│   └── .env                # Backend environment variables
└── README.md
```

---

## 📡 API Reference

The Express backend exposes the following REST endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/drop` | `POST` | Creates a new encrypted drop. Expects `ciphertext`, `iv`, `ttlSeconds`, and optionally `hasPassword` / `salt`. |
| `/api/drop/:id` | `GET` | Retrieves a drop and **immediately deletes it** from the database (Atomic `findOneAndDelete`). |
| `/api/drop/:id/status` | `GET` | Checks if a drop is still alive (has not been read/expired) without deleting it. |
| `/api/stats` | `GET` | Returns global telemetry (total drops created, total drops annihilated). |

> Note: The API is protected by `express-rate-limit` to prevent brute-force creation or status-check spam.

---

## 🚀 Local Development

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)

### 1. Clone & Install
```bash
git clone <repository-url>
cd dead-drop

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Environment Variables

| Variable | Location | Description |
| :--- | :--- | :--- |
| `PORT` | `server/.env` | Port for the Express server (default: 3001) |
| `MONGODB_URI` | `server/.env` | Connection string for your MongoDB database |
| `VITE_API_PROXY` | `client/.env` | Local proxy for Vite (default: `http://localhost:3001`) |
| `VITE_API_URL` | `client/.env` | Production URL of the backend (if hosted separately) |

### 3. Run the App

Open two terminals.

**Terminal 1 (Backend):**
```bash
cd server
npm start
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🚢 Deployment (Vercel)

This project is configured to be deployed easily to Vercel as a single repository monorepo.

1. Import the root repository into Vercel.
2. The `server/vercel.json` file is already configured to route traffic to the Express backend.
3. Ensure you set the `MONGODB_URI` environment variable in the Vercel dashboard.
4. Set `VITE_API_URL` to your production domain if necessary for absolute routing in QR codes.

## ⚠️ Security Disclaimer

While Dead Drop implements maximum client-side restrictions (Disabling F12, Right-Click, Print, Save, Text Selection, and utilizing Focus-Blur Blackouts) alongside standard cryptographic protocols, it is ultimately a web-based application. Client-side security deters casual copying but can theoretically be bypassed by advanced users (e.g., using hardware capture cards, virtual machines, or modifying the browser binary). 

Always exercise caution when sharing highly sensitive information.
