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

const verifiedAt =
localStorage.getItem(
'mfaVerifiedAt'
);

const HOURS_24 =
24 * 60 * 60 * 1000;

if (
verifiedAt &&
Date.now() - Number(verifiedAt) > HOURS_24
) {

console.log(
  'MFA SESSION EXPIRED'
);

localStorage.removeItem(
  'mfaVerified'
);

localStorage.removeItem(
  'mfaVerifiedAt'
);

}

if (!token) {

console.log('NO TOKEN');

router.navigate(['/']);

return false;

}

if (
localStorage.getItem(
'mfaVerified'
) !== 'true'
) {

console.log(
  'MFA NOT VERIFIED'
);

router.navigate(['/mfa']);

return false;

}

console.log(
'ACCESS GRANTED'
);

return true;

};