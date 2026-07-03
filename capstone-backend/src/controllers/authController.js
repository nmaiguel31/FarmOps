// src/controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logEvent = require('../utils/logger');
const { ROLES, normalizeRole, isValidRole } = require('../config/roles');

const getSafeRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return isValidRole(normalizedRole) ? normalizedRole : ROLES.ADMINISTRATOR;
};

const getSafeFullName = (user) => {
  const fullName =
    typeof user.fullName === 'string'
      ? user.fullName.trim()
      : '';

  if (fullName) {
    return fullName;
  }

  const emailPrefix =
    typeof user.email === 'string'
      ? user.email.split('@')[0].trim()
      : '';

  return emailPrefix || 'User';
};

const buildUserProfile = (user) => ({
  id: user._id || user.id,
  email: user.email,
  fullName: getSafeFullName(user),
  role: getSafeRole(user.role),
  accountStatus: user.status === 'suspended' ? 'Suspended' : 'Active',
  memberSince: user.createdAt,
  lastLogin: user.lastLogin,
  mfaEnabled: user.mfaEnabled
});

// Register
exports.register = async (req, res) => {
  const { email, password } = req.body;
  const fullName =
    typeof req.body.fullName === 'string'
      ? req.body.fullName.trim()
      : '';

  try {
    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = await User.countDocuments();

    const user = await User.create({
      email,
      fullName,
      password: hashedPassword,
      role: userCount === 0 ? ROLES.ADMINISTRATOR : ROLES.FARM_MANAGER
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
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password)
      : false;

    if (!passwordMatches) {
      logEvent('warn', 'LOGIN_FAILURE', {
        email: req.body.email,
        ip: req.ip
      });

      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    if (user.status === 'suspended') {
      logEvent('warn', 'LOGIN_BLOCKED_SUSPENDED', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'This account is suspended. Contact your administrator.'
      });
    }

    const repairedRole = getSafeRole(user.role);
    const repairedFullName = getSafeFullName(user);
    const lastLogin = new Date();
    const repairFields = { lastLogin };

    if (user.role !== repairedRole) {
      repairFields.role = repairedRole;
    }

    if (user.fullName !== repairedFullName) {
      repairFields.fullName = repairedFullName;
    }

    await User.updateOne(
      { _id: user._id },
      { $set: repairFields },
      { runValidators: false }
    );

    const repairedUser = {
      ...user.toObject(),
      fullName: repairedFullName,
      role: repairedRole,
      lastLogin
    };

    const token = jwt.sign(
      { id: user._id, role: repairedRole },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    logEvent('info', 'LOGIN_SUCCESS', {
      userId: user._id,
      email: user.email,
      role: repairedRole,
      ip: req.ip
    });

    return res.json({
      token,
      user: buildUserProfile(repairedUser)
    });

  } catch (error) {
    logEvent('error', 'LOGIN_ERROR', {
      email,
      message: error.message,
      ip: req.ip
    });

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

    if (!fullName) {
      return res.status(400).json({
        message: 'Full name is required'
      });
    }

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
