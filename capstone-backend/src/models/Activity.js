const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true
    },

    date: {
      type: Date,
      default: Date.now
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Activity', activitySchema);