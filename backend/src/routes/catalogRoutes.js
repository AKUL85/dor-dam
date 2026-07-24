// ─────────────────────────────────────────────────────────────
//  Catalog routes — the GSMArena-style public browsing API.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/catalogController');

const router = express.Router();

router.get('/catalog/meta', asyncHandler(controller.meta));
router.get('/brands', asyncHandler(controller.brands));
router.get('/search', asyncHandler(controller.search));
router.get('/compare', asyncHandler(controller.compare));
router.get('/phones', asyncHandler(controller.phones));
router.get('/phones/:slug', asyncHandler(controller.phone));

module.exports = router;
