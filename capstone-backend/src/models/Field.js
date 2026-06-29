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

    healthIndex: {
      type: Number,
      default: null
    },

    ndviScore: {
      type: Number,
      default: null
    },

    vegetationStatus: {
      type: String,
      default: ''
    },

    soilMoisture: {
      type: Number,
      default: null
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
    },

    ndviHistory: {
      type: [
        {
          value: {
            type: Number,
            required: true
          },
          recordedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Field', fieldSchema);
