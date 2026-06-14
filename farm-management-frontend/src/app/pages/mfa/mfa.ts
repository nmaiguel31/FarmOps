import {
  Component,
  inject,
  ChangeDetectorRef
} from '@angular/core';

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
export class MfaComponent {

  qrCode = '';

  token = '';


  message = '';
  private cdr = inject(ChangeDetectorRef);
  private mfaService =
    inject(Mfa);

  generateQR() {

    this.mfaService.setupMFA()
      .subscribe({

        next: (data: any) => {

          console.log('QR recibido:', data);

          this.qrCode = data.qrCode;

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

          this.cdr.detectChanges();

        },

        error: () => {

          this.message = 'Invalid code';

          this.cdr.detectChanges();

        }

      });

  }

}