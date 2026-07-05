const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const getUserSnapshot = async (user = {}) => {
  const userId = user.id || user._id;
  let userName = user.fullName || user.name || '';
  let userEmail = user.email || '';
  let userRole = user.role || '';

  if (userId && (!userName || !userEmail)) {
    const persistedUser = await User.findById(userId).select('fullName email role');

    if (persistedUser) {
      userName = userName || persistedUser.fullName || '';
      userEmail = userEmail || persistedUser.email || '';
      userRole = userRole || persistedUser.role || '';
    }
  }

  return {
    userId,
    userName,
    userEmail,
    userRole
  };
};

const writeAuditLog = async ({
  user,
  action,
  module,
  entityType = '',
  entityName = '',
  entityId = '',
  details = '',
  severity = 'info'
}) => {
  try {
    if (!action || !module) {
      return;
    }

    await AuditLog.create({
      ...(await getUserSnapshot(user)),
      action,
      module,
      entityType,
      entityName,
      entityId: entityId ? String(entityId) : '',
      details,
      severity
    });
  } catch (error) {
    // Audit logging must never block the primary business action.
    console.error('Audit log write failed:', error.message);
  }
};

module.exports = {
  writeAuditLog
};
