const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, me, uploadAvatar, deleteAvatar, updateProfile, updatePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // 1000 requests in development, 20 in production
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please try again in 15 minutes.',
  },
});

router.post(
  '/register',
  authLimiter,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('phone', 'Phone number must be exactly 10 digits').isLength({ min: 10, max: 10 }).isNumeric(),
  ],
  register
);

router.post(
  '/login',
  authLimiter,
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

router.get('/me', protect, me);
router.put(
  '/profile',
  protect,
  [
    check('phone', 'Phone number must be exactly 10 digits').optional().isLength({ min: 10, max: 10 }).isNumeric(),
    check('email', 'Please include a valid email').optional().isEmail(),
  ],
  updateProfile
);
router.put('/profile/avatar', protect, uploadAvatar);
router.delete('/profile/avatar', protect, deleteAvatar);
router.put(
  '/profile/password',
  protect,
  [
    check('currentPassword', 'Current password is required').exists(),
    check('newPassword', 'New password must be 6 or more characters').isLength({ min: 6 }),
  ],
  updatePassword
);

router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
