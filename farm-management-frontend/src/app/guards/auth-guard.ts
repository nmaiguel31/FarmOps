import { inject } from '@angular/core';

import {
CanActivateFn,
Router
} from '@angular/router';
import { Auth } from '../services/auth';
import { canAccessRoute } from '../shared/rbac/roles';
import { catchError, map, of } from 'rxjs';

const HOURS_24 =
24 * 60 * 60 * 1000;

export function clearAuthSession() {

localStorage.removeItem('token');
localStorage.removeItem('farmopsUser');
localStorage.removeItem('mfaVerified');
localStorage.removeItem('mfaVerifiedAt');

}

export function hasValidToken() {

const token =
localStorage.getItem('token');

if (!token) {
  return false;
}

try {
  const payload =
    JSON.parse(
      atob(token.split('.')[1] || '')
    );

  if (
    payload?.exp &&
    Date.now() >= payload.exp * 1000
  ) {
    clearAuthSession();
    return false;
  }
} catch {
  clearAuthSession();
  return false;
}

return true;

}

export function hasActiveMfaSession() {

const verifiedAt =
localStorage.getItem('mfaVerifiedAt');

if (
verifiedAt &&
Date.now() - Number(verifiedAt) > HOURS_24
) {
  localStorage.removeItem('mfaVerified');
  localStorage.removeItem('mfaVerifiedAt');
  return false;
}

return localStorage.getItem('mfaVerified') === 'true';

}

export const authGuard: CanActivateFn = () => {

const router = inject(Router);
const auth = inject(Auth);

if (!hasValidToken()) {
  return router.createUrlTree(['/login']);
}

if (!hasActiveMfaSession()) {
  return router.createUrlTree(['/mfa']);
}

return auth.ensureSessionReady().pipe(
  map((user) => user ? true : router.createUrlTree(['/login'])),
  catchError(() => of(router.createUrlTree(['/login'])))
);

};

export const roleGuard: CanActivateFn = (route) => {

const router = inject(Router);
const auth = inject(Auth);

if (!hasValidToken()) {
  return router.createUrlTree(['/login']);
}

if (!hasActiveMfaSession()) {
  return router.createUrlTree(['/mfa']);
}

const routeKey =
  route.routeConfig?.path || '';

return auth.ensureSessionReady().pipe(
  map((user) =>
    user && canAccessRoute(auth.getCurrentRole(), routeKey)
      ? true
      : router.createUrlTree(['/access-denied'])
  ),
  catchError(() => of(router.createUrlTree(['/login'])))
);

};

export const publicAuthGuard: CanActivateFn = () => {

const router = inject(Router);

if (!hasValidToken()) {
  return true;
}

if (!hasActiveMfaSession()) {
  return router.createUrlTree(['/mfa']);
}

const auth = inject(Auth);

return auth.ensureSessionReady().pipe(
  map((user) =>
    user
      ? router.createUrlTree(['/dashboard'])
      : router.createUrlTree(['/login'])
  ),
  catchError(() => of(router.createUrlTree(['/login'])))
);

};

export const mfaAccessGuard: CanActivateFn = () => {

const router = inject(Router);

return hasValidToken()
  ? true
  : router.createUrlTree(['/login']);

};
