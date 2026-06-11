const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    location: {
      type: String,
      required: true
    },

    latitude: {
      type: Number,
      default: null
    },

    longitude: {
      type: Number,
      default: null
    },

    size: {
      type: Number,
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Farm', farmSchema);