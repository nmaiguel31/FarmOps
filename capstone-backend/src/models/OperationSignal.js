const mongoose = require('mongoose');

const operationSignalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: [
        'Irrigation',
        'Weather',
        'Crop Lifecycle',
        'Financial',
        'NDVI',
        'System'
      ],
      required: true
    },

    priority: {
      type: String,
      enum: [
        'Critical',
        'High',
        'Medium',
        'Low'
      ],
      default: 'Medium'
    },

    status: {
      type: String,
      enum: [
        'Active',
        'Resolved'
      ],
      default: 'Active'
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

    recommendedAction: {
      type: String,
      required: true
    },

    ruleKey: {
      type: String,
      trim: true,
      default: ''
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

operationSignalSchema.index({
  status: 1,
  category: 1,
  farm: 1,
  field: 1
});

operationSignalSchema.index(
  { ruleKey: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      ruleKey: {
        $type: 'string',
        $gt: ''
      }
    }
  }
);

operationSignalSchema.virtual('farmId').get(function getFarmId() {
  return this.farm?._id?.toString?.() || this.farm?.toString?.() || '';
});

operationSignalSchema.virtual('fieldId').get(function getFieldId() {
  return this.field?._id?.toString?.() || this.field?.toString?.() || '';
});

operationSignalSchema.set('toJSON', {
  virtuals: true
});

operationSignalSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model(
  'OperationSignal',
  operationSignalSchema
);
