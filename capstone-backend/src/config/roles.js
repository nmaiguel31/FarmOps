const ROLES = {
  ADMINISTRATOR: 'administrator',
  FARM_MANAGER: 'farm_manager',
  ACCOUNTANT: 'accountant',
  FIELD_OPERATOR: 'field_operator'
};

const LEGACY_ROLE_MAP = {
  admin: ROLES.ADMINISTRATOR,
  manager: ROLES.FARM_MANAGER
};

const VALID_ROLES = Object.values(ROLES);

const READ_ALL_FARM_ROLES = [
  ROLES.ADMINISTRATOR,
  ROLES.FARM_MANAGER,
  ROLES.FIELD_OPERATOR,
  ROLES.ACCOUNTANT
];

const FARM_WRITE_ROLES = [
  ROLES.ADMINISTRATOR,
  ROLES.FARM_MANAGER
];

const FIELD_WRITE_ROLES = [
  ROLES.ADMINISTRATOR,
  ROLES.FARM_MANAGER,
  ROLES.FIELD_OPERATOR
];

const FINANCIAL_ROLES = [
  ROLES.ADMINISTRATOR,
  ROLES.ACCOUNTANT
];

const normalizeRole = (role) => {
  if (!role) {
    return ROLES.ADMINISTRATOR;
  }

  return LEGACY_ROLE_MAP[role] || role;
};

const isValidRole = (role) => VALID_ROLES.includes(normalizeRole(role));

const roleIs = (role, allowedRoles) =>
  allowedRoles.includes(normalizeRole(role));

module.exports = {
  ROLES,
  VALID_ROLES,
  normalizeRole,
  isValidRole,
  roleIs,
  READ_ALL_FARM_ROLES,
  FARM_WRITE_ROLES,
  FIELD_WRITE_ROLES,
  FINANCIAL_ROLES
};
