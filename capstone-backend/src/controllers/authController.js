// src/controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logEvent = require('../utils/logger');

// Register
exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: 'User created' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  logEvent('info', 'LOGIN_SUCCESS', {
    userId: user._id,
    email: user.email,
    role: user.role,
    ip: req.ip
  });

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role
    }
  });

} else {

  logEvent('warn', 'LOGIN_FAILURE', {
    email: req.body.email,
    ip: req.ip
  });

  res.status(401).json({
    message: 'Invalid credentials'
  });

}

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};