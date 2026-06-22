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

const zoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Field',
      required: true
    },

    polygonCoordinates: {
      type: [polygonPointSchema],
      default: []
    },

    area: {
      type: Number,
      required: true,
      default: 0
    },

    zoneType: {
      type: String,
      default: 'Monitoring'
    },

    healthScore: {
      type: Number,
      default: 0
    },

    moistureScore: {
      type: Number,
      default: 0
    },

    ndviScore: {
      type: Number,
      default: 0
    },

    recommendation: {
      type: String,
      default: ''
    },

    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Zone', zoneSchema);
