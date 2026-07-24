const express = require('express');
const scraperRoutes = require('./scraperRoutes');
const catalogRoutes = require('./catalogRoutes');
const { isAvailable } = require('../db/prisma');

const router = express.Router();

// Health/readiness probe.
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: isAvailable() ? 'connected' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

router.use('/scrapers', scraperRoutes);
// GSMArena-style catalog API (brands, phones, search, compare).
router.use('/', catalogRoutes);

module.exports = router;
