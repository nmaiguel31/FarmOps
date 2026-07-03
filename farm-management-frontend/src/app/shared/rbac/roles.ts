export type FarmOpsRole =
  'administrator' |
  'farm_manager' |
  'accountant' |
  'field_operator';

export const ROLE_LABELS: Record<FarmOpsRole, string> = {
  administrator: 'Administrator',
  farm_manager: 'Farm Manager',
  accountant: 'Accountant',
  field_operator: 'Field Operator'
};

const LEGACY_ROLE_MAP: Record<string, FarmOpsRole> = {
  admin: 'administrator',
  manager: 'farm_manager'
};

export function normalizeRole(role?: string | null): FarmOpsRole {
  if (!role) {
    return 'administrator';
  }

  return LEGACY_ROLE_MAP[role] || role as FarmOpsRole;
}

export const ROUTE_ROLES: Record<string, FarmOpsRole[]> = {
  dashboard: ['administrator', 'farm_manager', 'accountant', 'field_operator'],
  farms: ['administrator', 'farm_manager', 'field_operator'],
  crops: ['administrator', 'farm_manager'],
  'financial-records': ['administrator', 'accountant'],
  'operations-center': ['administrator', 'farm_manager', 'field_operator'],
  operations: ['administrator', 'farm_manager', 'field_operator'],
  weather: ['administrator', 'farm_manager', 'field_operator'],
  ndvi: ['administrator', 'farm_manager'],
  reports: ['administrator', 'farm_manager', 'accountant'],
  users: ['administrator'],
  profile: ['administrator', 'farm_manager', 'accountant', 'field_operator'],
  mfa: ['administrator', 'farm_manager', 'accountant', 'field_operator']
};

export function canAccessRoute(role: string | undefined | null, route: string) {
  const allowedRoles = ROUTE_ROLES[route];

  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.includes(normalizeRole(role));
}

export function canAccessAny(role: string | undefined | null, routes: string[]) {
  return routes.some(route => canAccessRoute(role, route));
}
