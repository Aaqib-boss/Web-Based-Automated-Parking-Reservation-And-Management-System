const express = require('express');
const { getFooterConfig, updateFooterConfig } = require('../controllers/footerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getFooterConfig)
  .put(protect, authorize('superadmin'), updateFooterConfig);

module.exports = router;
