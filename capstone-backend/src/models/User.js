const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'manager'],
    default: 'manager',
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
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);