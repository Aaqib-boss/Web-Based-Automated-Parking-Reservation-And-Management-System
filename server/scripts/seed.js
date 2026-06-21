const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const ParkingSpot = require('../models/ParkingSpot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const FooterConfig = require('../models/FooterConfig');

// Load env variables
dotenv.config();

const seedDB = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parking_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding...');

    // Clear existing collections
    await User.deleteMany();
    await ParkingSpot.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();
    await FooterConfig.deleteMany();
    console.log('Database collections cleared.');

    // Drop indexes on ParkingSpot if they exist to clean up old unique indexes
    try {
      await ParkingSpot.collection.dropIndexes();
      console.log('Old ParkingSpot indexes dropped.');
    } catch (e) {
      console.log('No old ParkingSpot indexes to drop, or collection is new.');
    }

    // Seed default footer config
    await FooterConfig.create({});
    console.log('Default footer config seeded.');

    // 1. Seed Users
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'super@parking.com',
      password: 'password123',
      phone: '9876543210',
      role: 'superadmin',
    });

    const opsAdmin = await User.create({
      name: 'Operations Admin',
      email: 'ops@parking.com',
      password: 'password123',
      phone: '8888877777',
      role: 'operationadmin',
    });

    const regularUser = await User.create({
      name: 'John Doe',
      email: 'john@gmail.com',
      password: 'password123',
      phone: '9999988888',
      role: 'user',
    });

    console.log('Users seeded successfully.');

    // 2. Seed Parking Spots (3 floors x 20 spots = 60 total)
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

        // Setup mock occupancy: G-05, 1-05 occupied; G-06, 2-06 reserved
        let status = 'available';
        if (s === 5) {
          status = 'occupied';
        } else if (s === 6) {
          status = 'reserved';
        }

        spots.push({
          spotNumber: spotNum,
          floor,
          status,
          type,
          sensor_id: `sensor_negombo_${prefix.toLowerCase()}_${s.toString().padStart(2, '0')}`,
          branch: 'Negombo',
        });
      }
    }

    const createdSpots = await ParkingSpot.insertMany(spots);
    console.log(`${createdSpots.length} Parking spots seeded successfully.`);

    // 3. Create mock booking and payment records for analytics (past 7 days)
    const mockBookings = [];
    const mockPayments = [];

    // Let's create some completed and active bookings to seed the database charts
    const now = new Date();

    // Map spots to associate them with bookings
    const spotG05 = createdSpots.find(s => s.spotNumber === 'G-05');
    const spotG06 = createdSpots.find(s => s.spotNumber === 'G-06');
    const spot105 = createdSpots.find(s => s.spotNumber === '1-05');
    const spot206 = createdSpots.find(s => s.spotNumber === '2-06');

    // Past booking 1: completed
    const startTime1 = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    const endTime1 = new Date(startTime1.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    const b1 = await Booking.create({
      userId: regularUser._id,
      spotId: spotG05._id,
      vehicleNumber: 'KA03MJ1234',
      startTime: startTime1,
      endTime: endTime1,
      duration: 2,
      amount: 50,
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: startTime1,
      branch: 'Negombo',
    });
    b1.qrCode = JSON.stringify({ bookingId: b1._id, spotNumber: 'G-05', vehicleNumber: 'KA03MJ1234' });
    await b1.save();
    
    await Payment.create({
      bookingId: b1._id,
      userId: regularUser._id,
      amount: 50,
      razorpayOrderId: 'order_seed_001',
      razorpayPaymentId: 'pay_seed_001',
      status: 'completed',
      createdAt: startTime1,
    });

    // Past booking 2: active (matches the G-05 spot's occupied status)
    const startTime2 = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hr ago
    const endTime2 = new Date(startTime2.getTime() + 4 * 60 * 60 * 1000); // 4 hrs duration
    const b2 = await Booking.create({
      userId: regularUser._id,
      spotId: spotG05._id,
      vehicleNumber: 'MH12AB5678',
      startTime: startTime2,
      endTime: endTime2,
      duration: 4,
      amount: 90,
      status: 'active',
      paymentStatus: 'paid',
      createdAt: startTime2,
      branch: 'Negombo',
    });
    b2.qrCode = JSON.stringify({ bookingId: b2._id, spotNumber: 'G-05', vehicleNumber: 'MH12AB5678' });
    await b2.save();

    await Payment.create({
      bookingId: b2._id,
      userId: regularUser._id,
      amount: 90,
      razorpayOrderId: 'order_seed_002',
      razorpayPaymentId: 'pay_seed_002',
      status: 'completed',
      createdAt: startTime2,
    });

    // Update spot currentBookingId
    spotG05.currentBookingId = b2._id;
    await spotG05.save();

    // Past booking 3: reserved (matches the G-06 spot's reserved status)
    const startTime3 = new Date(now.getTime() + 1 * 60 * 60 * 1000); // starts in 1 hr
    const endTime3 = new Date(startTime3.getTime() + 1 * 60 * 60 * 1000); // 1 hr duration
    const b3 = await Booking.create({
      userId: regularUser._id,
      spotId: spotG06._id,
      vehicleNumber: 'DL04CX9999',
      startTime: startTime3,
      endTime: endTime3,
      duration: 1,
      amount: 30,
      status: 'active',
      paymentStatus: 'paid',
      createdAt: now,
      branch: 'Negombo',
    });
    b3.qrCode = JSON.stringify({ bookingId: b3._id, spotNumber: 'G-06', vehicleNumber: 'DL04CX9999' });
    await b3.save();

    await Payment.create({
      bookingId: b3._id,
      userId: regularUser._id,
      amount: 30,
      razorpayOrderId: 'order_seed_003',
      razorpayPaymentId: 'pay_seed_003',
      status: 'completed',
      createdAt: now,
    });

    spotG06.currentBookingId = b3._id;
    await spotG06.save();

    // Add more bookings over the past week to populate charts
    for (let d = 2; d <= 7; d++) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      
      // Seed 1-2 bookings per day
      const count = Math.floor(Math.random() * 2) + 1;
      for (let c = 0; c < count; c++) {
        const dur = [1, 2, 4, 24][Math.floor(Math.random() * 4)];
        const amt = dur === 1 ? 30 : dur === 2 ? 50 : dur === 4 ? 90 : 150;
        
        const booking = await Booking.create({
          userId: regularUser._id,
          spotId: spot105._id,
          vehicleNumber: `DL${d}C${1000 + c}`,
          startTime: date,
          endTime: new Date(date.getTime() + dur * 60 * 60 * 1000),
          duration: dur,
          amount: amt,
          status: 'completed',
          paymentStatus: 'paid',
          createdAt: date,
          branch: 'Negombo',
        });

        await Payment.create({
          bookingId: booking._id,
          userId: regularUser._id,
          amount: amt,
          razorpayOrderId: `order_seed_prev_${d}_${c}`,
          razorpayPaymentId: `pay_seed_prev_${d}_${c}`,
          status: 'completed',
          createdAt: date,
        });
      }
    }

    console.log('Mock bookings and payments seeded for analytics.');
    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (err) {
    console.error(`Seeding error: ${err.message}`);
    process.exit(1);
  }
};

seedDB();
