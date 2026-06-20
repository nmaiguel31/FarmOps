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

const fieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    cropType: {
      type: String,
      default: ''
    },

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      default: null
    },

    area: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      required: true,
      default: 'Active'
    },

    healthStatus: {
      type: String,
      required: true,
      default: 'Good'
    },

    irrigationStatus: {
      type: String,
      required: true,
      default: 'Scheduled'
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    },

    notes: {
      type: String,
      default: ''
    },

    polygonCoordinates: {
      type: [polygonPointSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Field', fieldSchema);
