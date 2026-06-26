const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.CLIENT_OPS_URL || 'http://localhost:5174',
  process.env.CLIENT_SUPER_URL || 'http://localhost:5175',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://mern-web-based-automated-parking-re.vercel.app',
  'https://mern-web-based-automated-parking-reservation-and-dyg9xcucz.vercel.app',
  'https://mern-web-based-automated-parking-re-eight.vercel.app',
  'https://mern-web-based-automated-parking-and-jyx2fi8in.vercel.app',
  'https://parking-super-admin.vercel.app',
  'https://parking-super-admin-89agca0ri-mohamed-aaqib-s-projects.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('socketio', io);

io.on('connection', (socket) => {
  console.log(`New Socket Connection: ${socket.id}`);
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });
  socket.on('disconnect', () => {
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

const authRoutes = require('./routes/auth');
const spotRoutes = require('./routes/spots');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const footerRoutes = require('./routes/footer');
const pricingRoutes = require('./routes/pricing');

app.use('/api/auth', authRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/footer', footerRoutes);
app.use('/api/pricing', pricingRoutes);

app.get('/api/seed', async (req, res) => {
  try {
    const User = require('./models/User');
    const ParkingSpot = require('./models/ParkingSpot');
    const Booking = require('./models/Booking');
    const Payment = require('./models/Payment');
    const FooterConfig = require('./models/FooterConfig');

    await User.deleteMany();
    await ParkingSpot.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();
    await FooterConfig.deleteMany();

    await FooterConfig.create({});

    await User.create({
      name: 'Super Admin',
      email: 'super@parking.com',
      password: 'password123',
      phone: '9876543210',
      role: 'superadmin',
    });

    await User.create({
      name: 'Operations Admin',
      email: 'ops@parking.com',
      password: 'password123',
      phone: '8888877777',
      role: 'operationadmin',
    });

    await User.create({
      name: 'John Doe',
      email: 'john@gmail.com',
      password: 'password123',
      phone: '9999988888',
      role: 'user',
    });

    const floors = ['Ground', '1st', '2nd'];
    const spots = [];

    for (let f = 0; f < floors.length; f++) {
      const floor = floors[f];
      const prefix = floor === 'Ground' ? 'G' : floor.charAt(0);
      for (let s = 1; s <= 20; s++) {
        const spotNum = `${prefix}-${s.toString().padStart(2, '0')}`;
        let type = 'regular';
        if (s === 1 || s === 2) type = 'EV';
        else if (s === 3 || s === 4) type = 'handicap';
        let status = 'available';
        if (s === 5) status = 'occupied';
        else if (s === 6) status = 'reserved';
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

    await ParkingSpot.insertMany(spots);

    res.json({ success: true, message: 'Database seeded successfully! Users, spots created.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Smart Parking API is running...' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
