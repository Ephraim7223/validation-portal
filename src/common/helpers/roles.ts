export type AccountRole = 'admin' | 'super-admin' | 'hub';

/** Canonical admin roles for JwtGuard allow-lists (admin implies super-admin via roleAllowed). */
export const ADMIN_ROLES = ['admin', 'super-admin'] as const;

/** Accepts admin, Super-admin, super-admin, Super Admin, hub, etc. */
export function normalizeAccountRole(
  role?: string | null,
): AccountRole | null {
  const value = (role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  if (
    value === 'super-admin' ||
    value === 'superadmin' ||
    value === 'super-administrator'
  ) {
    return 'super-admin';
  }
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (value === 'hub') return 'hub';
  return null;
}

export function isAdminRole(role?: string | null): boolean {
  const normalized = normalizeAccountRole(role);
  return normalized === 'admin' || normalized === 'super-admin';
}

/**
 * `admin` in the allow-list also admits super-admin.
 * `super-admin` and `hub` match only themselves.
 */
export function roleAllowed(
  actualRole: string | undefined | null,
  allowed: string[],
): boolean {
  const actual = normalizeAccountRole(actualRole);
  if (!actual || !allowed?.length) return false;

  return allowed.some((role) => {
    const expected = normalizeAccountRole(role);
    if (!expected) return false;
    if (expected === 'admin') return isAdminRole(actual);
    return actual === expected;
  });
}

/** Staff is stored as Private. */
export function canonicalPersonnelRole(role?: string | null): string | null {
  const value = (role || '').trim().toLowerCase();
  if (value === 'intern') return 'Intern';
  if (value === 'freelancer' || value === 'freelancers') return 'Freelancer';
  if (value === 'private' || value === 'staff') return 'Private';
  return null;
}
