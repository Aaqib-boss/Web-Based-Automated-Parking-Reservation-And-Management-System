const express = require('express');
const { getStats, getRevenueAndOccupancyTrends, getUsers, toggleBlockUser, deleteUser, approveUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin')); // Secure all admin routes

router.get('/stats', getStats);
router.get('/revenue', getRevenueAndOccupancyTrends);
router.get('/users', getUsers);
router.patch('/users/:id/block', toggleBlockUser);
router.patch('/users/:id/approve', approveUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
