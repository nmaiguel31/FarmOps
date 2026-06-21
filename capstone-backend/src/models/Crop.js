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
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Crop', cropSchema);
