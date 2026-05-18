require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const securityHeaders = require('../middleware/securityHeaders');
const rateLimiter = require('../middleware/rateLimiter');
const dropRoutes = require('../routes/drops');
const { getStats, initStats } = require('../utils/stats');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(securityHeaders);

// Rate limit all API routes
app.use('/api', rateLimiter);

// ─── API Routes ────────────────────────────────────────────
app.use('/api/drop', dropRoutes);

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Vercel Static Fallback (Only run if not Vercel) ──────────
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

// ─── Database Connection ────────────────────────────────────
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
    console.log('✓ MongoDB connected');
    await initStats();
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
  }
};

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// ─── Server Start ──────────────────────────────────────────
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`✓ Dead Drop server running on port ${PORT}`);
    });
  });
}

// Export for Vercel Serverless
module.exports = app;
