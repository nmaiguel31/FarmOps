import {
  Component,
  inject,
  ChangeDetectorRef,
  OnInit
} from '@angular/core';

import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Mfa } from '../../services/mfa';
import { clearAuthSession } from '../../guards/auth-guard';
import { ConfirmationService } from '../../shared/confirm/confirmation.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-mfa',
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './mfa.html',
  styleUrl: './mfa.css'
})
export class MfaComponent
  implements OnInit {

  qrCode = '';

  token = '';

  message = '';

  mfaEnabled = false;
  mfaVerified = false;
  showVerification = false;
  setupMode = false;
  mfaActionLoading = false;

  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private mfaService = inject(Mfa);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {

    this.mfaService
      .getStatus()
      .subscribe({

        next: (data: any) => {

        this.mfaEnabled = data.mfaEnabled;

        if (!this.mfaEnabled) {

          this.setupMode = false;

        } else {

          this.showVerification = true;

        }

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(error);

        }

      });

  }

  generateQR() {
    if (this.mfaActionLoading) {
      return;
    }

    this.mfaActionLoading = true;

    this.mfaService.setupMFA()
      .subscribe({

      next: (data: any) => {
        this.mfaActionLoading = false;

        this.setupMode = true;

        this.qrCode = data.qrCode;

        this.showVerification = true;
        this.toast.info('QR code generated', 'Scan the QR code with your authenticator app.');

        this.cdr.detectChanges();

      },

      error: (error) => {
        this.mfaActionLoading = false;
        console.error(error);
        this.toast.error('Could not generate QR code', error?.error?.message || 'Please try again.');
        this.cdr.detectChanges();
      }

      });

  }

  verifyCode() {
    if (this.mfaActionLoading) {
      return;
    }

    this.mfaActionLoading = true;

    this.mfaService
      .verifyMFA(this.token)
      .subscribe({

      next: (data: any) => {
        this.mfaActionLoading = false;

        this.message = data.message;

        this.mfaEnabled = true;

        this.setupMode = false;

        this.mfaVerified = true;

        localStorage.setItem(
          'mfaVerified',
          'true'
        );

        localStorage.setItem(
          'mfaVerifiedAt',
          Date.now().toString()
        );

        this.router.navigate(['/dashboard']);
        this.toast.success('MFA enabled', 'Your workspace is now protected with multi-factor authentication.');

        this.cdr.detectChanges();

      },

        error: () => {
          this.mfaActionLoading = false;

          this.message = 'Invalid code';
          this.toast.error('Invalid MFA code', 'Check the 6-digit code and try again.');

          this.cdr.detectChanges();

        }

      });

  }

  disableMFA() {
    if (!this.confirmation.confirmDestructive(
      'Disable multi-factor authentication?',
      'Your account will be signed out and protected by password-only login until MFA is enabled again.'
    )) {
      return;
    }

    if (this.mfaActionLoading) {
      return;
    }

    this.mfaActionLoading = true;

    this.mfaService
      .disableMFA()
      .subscribe({

        next: (data: any) => {
          this.mfaActionLoading = false;

          this.message =
            data.message;

          this.mfaEnabled = false;

          this.setupMode = false;

          this.mfaVerified = false;

          this.qrCode = '';

          clearAuthSession();

          this.router.navigate(['/login']);
          this.toast.warning('MFA disabled', 'You have been signed out. Sign in again to continue.');

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(error);
          this.mfaActionLoading = false;
          this.toast.error('Could not disable MFA', error?.error?.message || 'Please try again.');
          this.cdr.detectChanges();

        }

      });

  }

regenerateQR() {

  this.mfaService
    .setupMFA()
    .subscribe({

      next: (data: any) => {

        this.qrCode =
          data.qrCode;

        this.mfaVerified = false;

        this.showVerification = true;

        this.message =
          'Scan the new QR code';

        localStorage.removeItem(
          'mfaVerified'
        );

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(error);

      }

    });

}

}
