// src/controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logEvent = require('../utils/logger');

const buildUserProfile = (user) => ({
  id: user._id,
  email: user.email,
  fullName: user.fullName || '',
  role: user.role,
  accountStatus: 'Active',
  memberSince: user.createdAt,
  lastLogin: user.lastLogin,
  mfaEnabled: user.mfaEnabled
});

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
      fullName: req.body.fullName || '',
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

  user.lastLogin = new Date();
  await user.save();

  res.json({
    token,
    user: buildUserProfile(user)
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

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -mfaSecret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(buildUserProfile(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const fullName =
      typeof req.body.fullName === 'string'
        ? req.body.fullName.trim()
        : '';

    if (fullName.length > 120) {
      return res.status(400).json({
        message: 'Full name must be 120 characters or fewer'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fullName = fullName;
    await user.save();

    res.json(buildUserProfile(user));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
