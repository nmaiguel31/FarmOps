const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { VALID_ROLES, normalizeRole, isValidRole } = require('../config/roles');

const VALID_STATUSES = ['active', 'suspended'];

const sanitizeUser = (user) => ({
  id: user._id || user.id,
  fullName: user.fullName || '',
  email: user.email,
  role: normalizeRole(user.role),
  status: user.status || 'active',
  createdAt: user.createdAt,
  lastLogin: user.lastLogin,
  mfaEnabled: Boolean(user.mfaEnabled)
});

const normalizeEmail = (email) =>
  typeof email === 'string'
    ? email.trim().toLowerCase()
    : '';

const normalizeFullName = (fullName) =>
  typeof fullName === 'string'
    ? fullName.trim()
    : '';

const normalizeStatus = (status) =>
  typeof status === 'string'
    ? status.trim().toLowerCase()
    : 'active';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return isValidRole(normalizedRole) ? normalizedRole : null;
};

const isValidationError = (error) =>
  error?.name === 'ValidationError' ||
  error?.name === 'CastError';

const isDuplicateKeyError = (error) =>
  error?.code === 11000 ||
  (error?.name === 'MongoServerError' && error?.code === 11000);

const isMongoDocumentValidationError = (error) =>
  error?.code === 121 ||
  /document failed validation/i.test(error?.message || '');

const getValidationMessage = (error, fallback) => {
  if (error?.name === 'ValidationError') {
    return Object.values(error.errors || {})
      .map((validationError) => validationError.message)
      .filter(Boolean)
      .join(' ') || fallback;
  }

  if (error?.name === 'CastError') {
    return 'Invalid user identifier';
  }

  return fallback;
};

const getDuplicateMessage = (error) => {
  const duplicateFields = Object.keys(error?.keyPattern || error?.keyValue || {});

  if (duplicateFields.includes('email')) {
    return 'A user with this email already exists';
  }

  return 'A user with these details already exists';
};

exports.getUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select('-password -mfaSecret')
      .sort({ createdAt: -1 });

    res.json(users.map(sanitizeUser));
  } catch (error) {
    res.status(500).json({ message: 'Could not load users', error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const fullName = normalizeFullName(req.body.fullName);
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === 'string'
        ? req.body.password
        : '';
    const role = validateRole(req.body.role);

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    if (!role) {
      return res.status(400).json({
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      status: 'active'
    });

    const validationError = user.validateSync();

    if (validationError) {
      return res.status(400).json({
        message: getValidationMessage(validationError, 'Invalid user details')
      });
    }

    await user.save();

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: getDuplicateMessage(error) });
    }

    if (isValidationError(error) || isMongoDocumentValidationError(error)) {
      return res.status(400).json({
        message: getValidationMessage(error, 'Invalid user details')
      });
    }

    res.status(500).json({ message: 'Could not create user', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const fullName = normalizeFullName(req.body.fullName);
    const role = validateRole(req.body.role);
    const status = normalizeStatus(req.body.status);

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    if (!role) {
      return res.status(400).json({
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: 'Status must be active or suspended'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          fullName,
          role,
          status
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password -mfaSecret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({
        message: getValidationMessage(error, 'Invalid user details')
      });
    }

    res.status(500).json({ message: 'Could not update user', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const password =
      typeof req.body.password === 'string'
        ? req.body.password
        : '';

    if (!password) {
      return res.status(400).json({ message: 'Temporary password is required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { password: hashedPassword } },
      { new: true }
    ).select('-password -mfaSecret');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(sanitizeUser(user));
  } catch (error) {
    if (isValidationError(error)) {
      return res.status(400).json({
        message: getValidationMessage(error, 'Invalid user details')
      });
    }

    res.status(500).json({ message: 'Could not reset password', error: error.message });
  }
};
