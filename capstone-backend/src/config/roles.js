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

const normalizeRole = (role) => {
  if (!role) {
    return ROLES.ADMINISTRATOR;
  }

  return LEGACY_ROLE_MAP[role] || role;
};

const isValidRole = (role) => VALID_ROLES.includes(normalizeRole(role));

module.exports = {
  ROLES,
  VALID_ROLES,
  normalizeRole,
  isValidRole
};
