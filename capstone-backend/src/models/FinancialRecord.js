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

    date: {
      type: Date,
      default: Date.now
    },

    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true
    },

    field: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Field',
      default: null
    },

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      default: null
    },

    quantity: {
      type: Number
    },

    unit: {
      type: String,
      default: ''
    },

    unitPrice: {
      type: Number
    },

    buyer: {
      type: String,
      default: ''
    },

    vendor: {
      type: String,
      default: ''
    },

    paymentStatus: {
      type: String,
      enum: ['Paid', 'Pending', 'Overdue'],
      default: 'Paid'
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

module.exports = mongoose.model(
  'FinancialRecord',
  financialRecordSchema
);
