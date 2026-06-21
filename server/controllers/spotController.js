const ParkingSpot = require('../models/ParkingSpot');

// Helper to dynamically generate default 60 spots for a branch
const generateSpotsForBranch = async (branch) => {
  const floors = ['Ground', '1st', '2nd'];
  const spots = [];

  for (let f = 0; f < floors.length; f++) {
    const floor = floors[f];
    const prefix = floor === 'Ground' ? 'G' : floor.charAt(0);

    for (let s = 1; s <= 20; s++) {
      const spotNum = `${prefix}-${s.toString().padStart(2, '0')}`;
      
      // Determine type: EV (1, 2), Handicap (3, 4), Regular (5-20)
      let type = 'regular';
      if (s === 1 || s === 2) {
        type = 'EV';
      } else if (s === 3 || s === 4) {
        type = 'handicap';
      }

      spots.push({
        spotNumber: spotNum,
        floor,
        status: 'available',
        type,
        sensor_id: `sensor_${branch.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${prefix.toLowerCase()}_${s.toString().padStart(2, '0')}`,
        branch,
      });
    }
  }

  try {
    return await ParkingSpot.insertMany(spots);
  } catch (err) {
    // Handle concurrent seeding edge cases gracefully by returning existing spots
    if (err.code === 11000) {
      return await ParkingSpot.find({ branch });
    }
    throw err;
  }
};

// @desc    Get all parking spots
// @route   GET /api/spots
// @access  Public
exports.getSpots = async (req, res) => {
  try {
    const branch = req.query.branch;
    let query = {};
    if (branch) {
      query.branch = branch;
      const count = await ParkingSpot.countDocuments({ branch });
      if (count === 0) {
        await generateSpotsForBranch(branch);
      }
    }
    const spots = await ParkingSpot.find(query);
    res.status(200).json({ success: true, count: spots.length, data: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get parking spots by floor
// @route   GET /api/spots/:floor
// @access  Public
exports.getSpotsByFloor = async (req, res) => {
  try {
    const floor = req.params.floor;
    const branch = req.query.branch || 'Negombo';

    // Map floor param e.g. ground -> Ground, 1st -> 1st, 2nd -> 2nd
    let floorName = floor.charAt(0).toUpperCase() + floor.slice(1);
    if (floorName !== 'Ground' && floorName !== '1st' && floorName !== '2nd') {
      floorName = floor;
    }
    
    // Ensure spots for the branch are seeded/created
    const count = await ParkingSpot.countDocuments({ branch });
    if (count === 0) {
      await generateSpotsForBranch(branch);
    }

    const spots = await ParkingSpot.find({ floor: floorName, branch });
    res.status(200).json({ success: true, count: spots.length, data: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update parking spot status
// @route   PATCH /api/spots/:id/status
// @access  Private (Admin or system update)
exports.updateSpotStatus = async (req, res) => {
  const { status, currentBookingId } = req.body;

  try {
    let spot = await ParkingSpot.findById(req.params.id);

    if (!spot) {
      return res.status(404).json({ success: false, message: 'Parking spot not found' });
    }

    spot.status = status || spot.status;
    if (currentBookingId !== undefined) {
      spot.currentBookingId = currentBookingId;
    }

    await spot.save();

    // Emit live update to socket clients
    const io = req.app.get('socketio');
    if (io) {
      io.emit('spotStatusChanged', {
        spotId: spot._id,
        spotNumber: spot.spotNumber,
        floor: spot.floor,
        status: spot.status,
        type: spot.type,
        currentBookingId: spot.currentBookingId,
        branch: spot.branch
      });
    }

    res.status(200).json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
