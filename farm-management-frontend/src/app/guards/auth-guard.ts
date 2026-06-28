import { inject } from '@angular/core';

import {
CanActivateFn,
Router
} from '@angular/router';

const HOURS_24 =
24 * 60 * 60 * 1000;

export function clearAuthSession() {

localStorage.removeItem('token');
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

if (!hasValidToken()) {
  return router.createUrlTree(['/login']);
}

if (!hasActiveMfaSession()) {
  return router.createUrlTree(['/mfa']);
}

return true;

};

export const publicAuthGuard: CanActivateFn = () => {

const router = inject(Router);

if (!hasValidToken()) {
  return true;
}

return hasActiveMfaSession()
  ? router.createUrlTree(['/dashboard'])
  : router.createUrlTree(['/mfa']);

};

export const mfaAccessGuard: CanActivateFn = () => {

const router = inject(Router);

return hasValidToken()
  ? true
  : router.createUrlTree(['/login']);

};
