const express = require('express');
const router = express.Router();
const { getPricing, updatePricing } = require('../controllers/pricingController');
const { protect, authorize } = require('../middleware/auth');

// Public route to view rates
router.get('/', getPricing);

// Protected routes to update rates (Super Admin, Operations Admin)
router.put('/', protect, authorize('superadmin', 'operationadmin'), updatePricing);

module.exports = router;
