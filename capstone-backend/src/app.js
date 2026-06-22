// src/app.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const farmRoutes = require('./routes/farmRoutes');
const cropRoutes = require('./routes/cropRoutes');
const fieldRoutes = require('./routes/fieldRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const financialRoutes = require('./routes/financialRoutes');
const systemRoutes = require('./routes/systemRoutes');


// Config
dotenv.config();

// Database connection
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);


// Base route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// API routes
app.use('/api/auth', authRoutes);
const mfaRoutes =
require('./routes/mfaRoutes');

app.use('/api/mfa',mfaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/financial-records', financialRoutes);
app.use('/api', systemRoutes);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
