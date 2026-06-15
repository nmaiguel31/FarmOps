import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  const token =
    localStorage.getItem('token');

  const mfaVerified =
    localStorage.getItem(
      'mfaVerified'
    );

  if (!token) {

    router.navigate(['/']);

    return false;

  }

  if (mfaVerified !== 'true') {

    router.navigate(['/mfa']);

    return false;

  }

  return true;

};