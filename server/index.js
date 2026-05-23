require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const securityHeaders = require('./middleware/securityHeaders');
const { apiLimiter } = require('./middleware/rateLimiter');
const dropRoutes = require('./routes/drops');
const { getStats, initStats } = require('./utils/stats');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── Database Connection ────────────────────────────────────
let cachedConnection = null;
let cachedConnectionPromise = null;

const connectDB = async () => {
  if (cachedConnection) return cachedConnection;
  if (mongoose.connection.readyState === 1) {
    cachedConnection = mongoose;
    return cachedConnection;
  }

  if (!cachedConnectionPromise) {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('Missing MongoDB URI in environment variables');

    mongoose.set('strictQuery', true);

    cachedConnectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    }).then(async (connection) => {
      cachedConnection = connection;
      console.log('✓ MongoDB connected');
      await initStats();
      return cachedConnection;
    }).catch((err) => {
      cachedConnectionPromise = null;
      console.error('✗ MongoDB connection failed:', err.message);
      throw err;
    });
  }

  return cachedConnectionPromise;
};

// ─── Middleware ────────────────────────────────────────────
// Trust the Vercel proxy for express-rate-limit
app.set('trust proxy', 1);

// CORS — strict origin whitelist (replaces manual headers)
app.use(cors({
  origin: CLIENT_ORIGIN === '*' ? '*' : CLIENT_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

app.use(express.json({ limit: '1mb' }));

// Security headers (powered by helmet)
app.use(securityHeaders);

// Rate limit all API routes
app.use('/api', apiLimiter);

// Ensure MongoDB is ready before routes touch Mongoose models.
app.use('/api/drop', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: 'Database unavailable.' });
  }
});

// ─── API Routes ────────────────────────────────────────────
app.use('/api/drop', dropRoutes);

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Dead Drop API',
    status: 'ok',
    health: '/api/health',
  });
});

app.get('/favicon.ico', (req, res) => {
  res.sendStatus(204);
});

app.get('/favicon.png', (req, res) => {
  res.sendStatus(204);
});



// ─── Vercel Static Fallback (Only run if not Vercel) ──────────
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

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
