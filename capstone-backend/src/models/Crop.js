const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    type: {
      type: String,
      required: true
    },

    season: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },

    icon: {
      type: String
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    },

    currentStage: {
      type: String,
      enum: [
        'Planning',
        'Land Preparation',
        'Planting',
        'Vegetative Growth',
        'Flowering',
        'Ripening',
        'Harvest'
      ],
      default: 'Planning'
    },

    stageStartedAt: {
      type: Date,
      default: Date.now
    },

    plantingDate: {
      type: Date
    },

    expectedHarvestDate: {
      type: Date
    },

    lifecycleDays: {
      type: Number,
      default: 120
    },

    ndviTarget: {
      type: Number
    },

    moistureTarget: {
      type: Number
    },

    optimalTemperatureMin: {
      type: Number
    },

    optimalTemperatureMax: {
      type: Number
    },

    expectedYield: {
      type: String
    },

    plantingSeason: {
      type: String
    },

    description: {
      type: String
    },

    growthStages: [
      {
        name: {
          type: String,
          required: true
        },
        startDay: {
          type: Number,
          required: true
        },
        endDay: {
          type: Number,
          required: true
        }
      }
    ],

    isDefaultTemplate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

cropSchema.index({ name: 1 });
cropSchema.index({ type: 1 });
cropSchema.index({ status: 1 });
cropSchema.index({ createdAt: -1 });
cropSchema.index({ farm: 1, name: 1 });
cropSchema.index({ farm: 1, isDefaultTemplate: 1 });

module.exports = mongoose.model('Crop', cropSchema);
