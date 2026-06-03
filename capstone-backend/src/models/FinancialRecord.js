const mongoose = require('mongoose');

const financialRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Income', 'Expense'],
      required: true
    },

    category: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    description: {
      type: String
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

module.exports = mongoose.model(
  'FinancialRecord',
  financialRecordSchema
);