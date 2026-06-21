const express = require('express');
const { getSpots, getSpotsByFloor, updateSpotStatus } = require('../controllers/spotController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getSpots);
router.get('/:floor', getSpotsByFloor);
router.patch('/:id/status', protect, authorize('operationadmin', 'superadmin'), updateSpotStatus);

module.exports = router;
