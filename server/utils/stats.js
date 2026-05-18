const Drop = require('../models/Drop');

// In-memory counters for fast reads
let totalDropsCreated = 0;
let burnedToday = 0;
let lastResetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function resetDailyIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    burnedToday = 0;
    lastResetDate = today;
  }
}

function incrementCreated() {
  resetDailyIfNeeded();
  totalDropsCreated++;
}

function incrementBurned() {
  resetDailyIfNeeded();
  burnedToday++;
}

function getStats() {
  resetDailyIfNeeded();
  return {
    totalDropsCreated,
    totalBurnedToday: burnedToday,
  };
}

// Initialize counters from database on startup
async function initStats() {
  try {
    totalDropsCreated = await Drop.countDocuments();
  } catch (err) {
    console.error('Failed to init stats:', err.message);
  }
}

module.exports = {
  incrementCreated,
  incrementBurned,
  getStats,
  initStats,
};
