const mongoose = require('mongoose');

const polygonPointSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true
    },

    lng: {
      type: Number,
      required: true
    }
  },
  {
    _id: false
  }
);

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

    polygonCoordinates: {
      type: [polygonPointSchema],
      default: []
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
