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

  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private mfaService = inject(Mfa);

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

    this.mfaService.setupMFA()
      .subscribe({

      next: (data: any) => {

        this.setupMode = true;

        this.qrCode = data.qrCode;

        this.showVerification = true;

        this.cdr.detectChanges();

      }

      });

  }

  verifyCode() {

    this.mfaService
      .verifyMFA(this.token)
      .subscribe({

      next: (data: any) => {

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

        this.cdr.detectChanges();

      },

        error: () => {

          this.message = 'Invalid code';

          this.cdr.detectChanges();

        }

      });

  }

  disableMFA() {

    this.mfaService
      .disableMFA()
      .subscribe({

        next: (data: any) => {

          this.message =
            data.message;

          this.mfaEnabled = false;

          this.setupMode = false;

          this.mfaVerified = false;

          this.qrCode = '';

          localStorage.removeItem(
            'mfaVerified'
          );

          this.generateQR();

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(error);

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
