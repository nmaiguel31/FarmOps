import {
  Component,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Mfa } from '../../services/mfa';

@Component({
  selector: 'app-mfa',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './mfa.html',
  styleUrl: './mfa.css'
})
export class MfaComponent {

  qrCode = '';

  token = '';

  message = '';

  private mfaService =
    inject(Mfa);

  generateQR() {

    this.mfaService.setupMFA()
      .subscribe({

        next: (data: any) => {

          this.qrCode =
            data.qrCode;

        }

      });

  }

  verifyCode() {

    this.mfaService
      .verifyMFA(this.token)
      .subscribe({

        next: (data: any) => {

          this.message =
            data.message;

        },

        error: () => {

          this.message =
            'Invalid code';

        }

      });

  }

}