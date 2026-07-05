const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: {
    type: String,
    default: ''
  },
  userEmail: {
    type: String,
    default: ''
  },
  userRole: {
    type: String,
    default: ''
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  module: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    default: ''
  },
  entityName: {
    type: String,
    default: ''
  },
  entityId: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'danger'],
    default: 'info',
    index: true
  }
}, {
  timestamps: {
    createdAt: 'timestamp',
    updatedAt: false
  }
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userEmail: 1 });
auditLogSchema.index({ userRole: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
