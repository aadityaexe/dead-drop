const mongoose = require('mongoose');
const crypto = require('crypto');

const dropSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => crypto.randomUUID(),
  },
  ciphertext: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    default: null,
  },
  hasPassword: {
    type: Boolean,
    default: false,
  },
  maxViews: {
    type: Number,
    default: 1,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  burned: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

// MongoDB TTL index — automatically deletes documents when expiresAt passes
dropSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Drop', dropSchema);
