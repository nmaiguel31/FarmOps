const mongoose = require('mongoose');
const {
  ROLES,
  VALID_ROLES,
  normalizeRole
} = require('../config/roles');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    trim: true,
    required: true
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: VALID_ROLES,
    default: ROLES.FARM_MANAGER,
    set: normalizeRole
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  farms: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  }
  ],
  mfaEnabled: {
  type: Boolean,
  default: false
  },
  mfaSecret: {
  type: String,
  default: ''
  },
  lastLogin: {
  type: Date
  }
}, { timestamps: true });

userSchema.pre('validate', function normalizeUserRole() {
  this.role = normalizeRole(this.role);
});

module.exports = mongoose.model('User', userSchema);
