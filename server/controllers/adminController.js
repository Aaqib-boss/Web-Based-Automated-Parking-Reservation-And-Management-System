const Booking = require('../models/Booking');
const User = require('../models/User');
const ParkingSpot = require('../models/ParkingSpot');

// @desc    Get Admin Stats Summary
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    const branch = req.query.branch;
    
    // Build query matches
    const revenueMatch = { paymentStatus: 'paid', status: { $ne: 'cancelled' } };
    const spotMatch = {};
    const activeBookingMatch = { status: 'active', paymentStatus: 'paid' };

    if (branch) {
      revenueMatch.branch = branch;
      spotMatch.branch = branch;
      activeBookingMatch.branch = branch;
    }

    // Total Revenue (Only completed & paid bookings)
    const revenueResult = await Booking.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Total Spots & Occupied/Reserved Spots
    const totalSpots = await ParkingSpot.countDocuments(spotMatch);
    const occupiedOrReservedSpots = await ParkingSpot.countDocuments({
      ...spotMatch,
      status: { $in: ['occupied', 'reserved'] },
    });

    const occupancyRate = totalSpots > 0 ? Math.round((occupiedOrReservedSpots / totalSpots) * 100) : 0;

    // Active Bookings Count
    const activeBookings = await Booking.countDocuments(activeBookingMatch);

    // Total Registered Users
    const totalUsers = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        occupancyRate,
        totalSpots,
        occupiedSpots: occupiedOrReservedSpots,
        activeBookings,
        totalUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get Revenue and Occupancy Trends for Charts
// @route   GET /api/admin/revenue
// @access  Private/Admin
exports.getRevenueAndOccupancyTrends = async (req, res) => {
  try {
    const branch = req.query.branch;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueMatch = {
      paymentStatus: 'paid',
      status: { $ne: 'cancelled' },
      createdAt: { $gte: sevenDaysAgo },
    };
    const spotMatch = {};

    if (branch) {
      revenueMatch.branch = branch;
      spotMatch.branch = branch;
    }

    const revenueTrends = await Booking.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          bookingsCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format for recharts [{ date: '2026-06-11', revenue: 500, bookings: 3 }]
    const chartData = revenueTrends.map((trend) => ({
      date: trend._id,
      revenue: trend.revenue,
      bookings: trend.bookingsCount,
    }));

    // Spot breakdown by floor
    const spotBreakdown = await ParkingSpot.aggregate([
      { $match: spotMatch },
      {
        $group: {
          _id: '$floor',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] },
          },
          reserved: {
            $sum: { $cond: [{ $eq: ['$status', 'reserved'] }, 1, 0] },
          },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      revenueTrends: chartData,
      spotBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get User List
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Toggle block status of a user
// @route   PATCH /api/admin/users/:id/block
// @access  Private/Admin
exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.email === 'super@parking.com') {
      return res.status(400).json({ success: false, message: 'The main super admin account cannot be blocked' });
    }
    if (user.role === 'superadmin' && req.user.email !== 'super@parking.com') {
      return res.status(403).json({ success: false, message: 'Only the main super admin can block other super admin accounts' });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.status(200).json({ success: true, message: `User has been ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.email === 'super@parking.com') {
      return res.status(400).json({ success: false, message: 'The main super admin account cannot be deleted' });
    }
    if (user.role === 'superadmin' && req.user.email !== 'super@parking.com') {
      return res.status(403).json({ success: false, message: 'Only the main super admin can delete other super admin accounts' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User has been deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Approve a user account
// @route   PATCH /api/admin/users/:id/approve
// @access  Private/Admin
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isApproved = true;
    await user.save();
    res.status(200).json({ success: true, message: `User ${user.name} has been approved successfully`, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
