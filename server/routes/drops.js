const express = require('express');
const router = express.Router();
const Drop = require('../models/Drop');
const { incrementCreated, incrementBurned } = require('../utils/stats');

// Expiry option → milliseconds mapping
const EXPIRY_MAP = {
  'burn_after_read': 24 * 60 * 60 * 1000,   // 24h max TTL even for burn-after-read
  '1h':  1 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
};

// POST /api/drop — Create a new drop
router.post('/', async (req, res) => {
  try {
    const { ciphertext, iv, salt, hasPassword, maxViews, expiryOption } = req.body;

    if (!ciphertext || !iv) {
      return res.status(400).json({ error: 'ciphertext and iv are required.' });
    }

    const expiryMs = EXPIRY_MAP[expiryOption] || EXPIRY_MAP['24h'];
    const expiresAt = new Date(Date.now() + expiryMs);

    const drop = new Drop({
      ciphertext,
      iv,
      salt: salt || null,
      hasPassword: !!hasPassword,
      maxViews: [1, 3, 5].includes(maxViews) ? maxViews : 1,
      expiresAt,
    });

    await drop.save();
    incrementCreated();

    res.status(201).json({
      id: drop._id,
      expiresAt: drop.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Create drop error:', err.message);
    res.status(500).json({ error: 'Failed to create drop.' });
  }
});

// GET /api/drop/:id — Read and atomically delete (burn-on-read)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // For single-view drops, use findOneAndDelete for atomic burn
    // For multi-view drops, increment viewCount and burn when limit reached
    const drop = await Drop.findById(id);

    if (!drop || drop.burned) {
      return res.status(404).json({ error: 'This drop no longer exists.' });
    }

    // Increment view count
    drop.viewCount += 1;

    // Check if this is the last allowed view
    if (drop.viewCount >= drop.maxViews) {
      // Atomic delete — no race condition
      const deleted = await Drop.findOneAndDelete({
        _id: id,
        burned: false,
      });

      if (!deleted) {
        return res.status(404).json({ error: 'This drop no longer exists.' });
      }

      incrementBurned();

      return res.json({
        ciphertext: deleted.ciphertext,
        iv: deleted.iv,
        salt: deleted.salt,
        hasPassword: deleted.hasPassword,
        burned: true,
      });
    }

    // Multi-view: save updated count
    await drop.save();

    res.json({
      ciphertext: drop.ciphertext,
      iv: drop.iv,
      salt: drop.salt,
      hasPassword: drop.hasPassword,
      burned: false,
      viewsRemaining: drop.maxViews - drop.viewCount,
    });
  } catch (err) {
    console.error('Read drop error:', err.message);
    res.status(500).json({ error: 'Failed to read drop.' });
  }
});

// GET /api/drop/:id/status — Check if drop is still alive (non-destructive)
router.get('/:id/status', async (req, res) => {
  try {
    const drop = await Drop.findById(req.params.id, 'expiresAt burned');

    if (!drop || drop.burned) {
      return res.json({ alive: false });
    }

    res.json({
      alive: true,
      expiresAt: drop.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(500).json({ error: 'Failed to check status.' });
  }
});

module.exports = router;
