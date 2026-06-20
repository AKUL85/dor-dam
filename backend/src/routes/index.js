const express = require('express');
const scraperRoutes = require('./scraperRoutes');
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

module.exports = router;
