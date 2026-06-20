const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const controller = require('../controllers/scraperController');

const router = express.Router();

router.get('/', controller.listStores);
router.post('/:store/run', asyncHandler(controller.runStore));

module.exports = router;
