require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const securityHeaders = require('./middleware/securityHeaders');
const rateLimiter = require('./middleware/rateLimiter');
const dropRoutes = require('./routes/drops');
const { getStats, initStats } = require('./utils/stats');

const app = express();
const PORT = process.env.PORT || 3001;

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
