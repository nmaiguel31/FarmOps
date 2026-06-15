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
    localStorage.getItem('mfaVerified');

  if (!token) {

    console.log('NO TOKEN');

    router.navigate(['/']);

    return false;

  }

  if (mfaVerified !== 'true') {

    console.log('MFA NOT VERIFIED');

    router.navigate(['/mfa']);

    return false;

  }

  console.log('ACCESS GRANTED');

  return true;

};