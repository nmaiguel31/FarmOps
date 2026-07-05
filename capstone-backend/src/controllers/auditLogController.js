const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('../services/auditLogService');

const buildAuditQuery = (query) => {
  const filters = {};

  if (query.user) {
    const userPattern = new RegExp(String(query.user).trim(), 'i');
    filters.$or = [
      { userName: userPattern },
      { userEmail: userPattern }
    ];
  }

  if (query.role && query.role !== 'All') {
    filters.userRole = query.role;
  }

  if (query.module && query.module !== 'All') {
    filters.module = query.module;
  }

  if (query.action && query.action !== 'All') {
    filters.action = query.action;
  }

  if (query.severity && query.severity !== 'All') {
    filters.severity = query.severity;
  }

  if (query.startDate || query.endDate) {
    filters.timestamp = {};

    if (query.startDate) {
      filters.timestamp.$gte = new Date(`${query.startDate}T00:00:00.000Z`);
    }

    if (query.endDate) {
      filters.timestamp.$lte = new Date(`${query.endDate}T23:59:59.999Z`);
    }
  }

  return filters;
};

const getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 250), 500);
    const logs = await AuditLog.find(buildAuditQuery(req.query))
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({
      message: 'Could not load audit logs',
      error: error.message
    });
  }
};

const createClientAuditLog = async (req, res) => {
  try {
    await writeAuditLog({
      user: req.user,
      action: req.body.action,
      module: req.body.module,
      entityType: req.body.entityType || '',
      entityName: req.body.entityName || '',
      entityId: req.body.entityId || '',
      details: req.body.details || '',
      severity: req.body.severity || 'info'
    });

    res.status(201).json({ message: 'Audit event recorded' });
  } catch (error) {
    res.status(500).json({
      message: 'Could not record audit event',
      error: error.message
    });
  }
};

module.exports = {
  getAuditLogs,
  createClientAuditLog
};
