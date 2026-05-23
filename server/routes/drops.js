const express = require("express");
const router = express.Router();
const Drop = require("../models/Drop");
const { incrementCreated, incrementBurned } = require("../utils/stats");
const { readLimiter } = require("../middleware/rateLimiter");

// ─── Constants ─────────────────────────────────────────────
const EXPIRY_MAP = {
  burn_after_read: 24 * 60 * 60 * 1000, // 24h max TTL even for burn-after-read
  "1h": 1 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};
const ALLOWED_MAX_VIEWS = new Set([1, 3, 5]);
const MAX_CIPHERTEXT_LENGTH = 500_000; // 500 KB max ciphertext
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers ───────────────────────────────────────────────
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUUID(id) {
  return typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Middleware: Validate :id param is a valid UUID.
 * Prevents NoSQL injection and malformed query attacks.
 */
function validateId(req, res, next) {
  if (!isValidUUID(req.params.id)) {
    return res.status(400).json({ error: "Invalid drop identifier." });
  }
  next();
}

// ─── POST /api/drop — Create a new drop ────────────────────
router.post("/", async (req, res) => {
  try {
    const { ciphertext, iv, salt, hasPassword, maxViews, expiryOption } =
      req.body;

    // Validate required fields
    if (!isNonEmptyString(ciphertext) || !isNonEmptyString(iv)) {
      return res.status(400).json({ error: "ciphertext and iv are required." });
    }

    // Validate ciphertext length to prevent abuse
    if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
      return res.status(413).json({ error: "Payload too large." });
    }

    // Validate IV length (AES-GCM uses 12-byte IV = 16 chars base64)
    if (iv.length > 24) {
      return res.status(400).json({ error: "Invalid IV." });
    }

    const expiryMs = EXPIRY_MAP[expiryOption] || EXPIRY_MAP["24h"];
    const expiresAt = new Date(Date.now() + expiryMs);
    const safeMaxViews = ALLOWED_MAX_VIEWS.has(Number(maxViews))
      ? Number(maxViews)
      : 1;

    const drop = new Drop({
      ciphertext: ciphertext.trim(),
      iv: iv.trim(),
      salt: isNonEmptyString(salt) ? salt.trim() : null,
      hasPassword: !!hasPassword,
      maxViews: safeMaxViews,
      expiresAt,
    });

    await drop.save();
    incrementCreated();

    res.status(201).json({
      id: drop._id,
      expiresAt: drop.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Create drop error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// ─── GET /api/drop/:id — Read and atomically burn ──────────
router.get("/:id", validateId, readLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const activeQuery = {
      _id: id,
      burned: false,
      expiresAt: { $gt: new Date() },
    };

    // Try non-final read: increment viewCount if not at the last view
    const drop = await Drop.findOneAndUpdate(
      {
        ...activeQuery,
        $expr: { $lt: ["$viewCount", { $subtract: ["$maxViews", 1] }] },
      },
      { $inc: { viewCount: 1 } },
      { new: true },
    );

    if (!drop) {
      // Try final read: atomically delete the document
      const deleted = await Drop.findOneAndDelete({
        ...activeQuery,
        $expr: { $lt: ["$viewCount", "$maxViews"] },
      });

      if (!deleted) {
        return res.status(404).json({ error: "This drop no longer exists." });
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

    res.json({
      ciphertext: drop.ciphertext,
      iv: drop.iv,
      salt: drop.salt,
      hasPassword: drop.hasPassword,
      burned: false,
      viewsRemaining: drop.maxViews - drop.viewCount,
    });
  } catch (err) {
    console.error("Read drop error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

// ─── GET /api/drop/:id/status — Non-destructive check ──────
router.get("/:id/status", validateId, async (req, res) => {
  try {
    const drop = await Drop.findOne(
      {
        _id: req.params.id,
        burned: false,
        expiresAt: { $gt: new Date() },
      },
      "expiresAt",
    );

    if (!drop) {
      return res.json({ alive: false });
    }

    res.json({
      alive: true,
      expiresAt: drop.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Status check error:", err.message);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
