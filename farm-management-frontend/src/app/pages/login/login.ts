import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  email = '';
  password = '';
  loginLoading = false;

  private authService = inject(Auth);
  private router = inject(Router);
  private toast = inject(ToastService);

  onLogin() {
    if (this.loginLoading) {
      return;
    }

    this.loginLoading = true;

    this.authService.login(
      this.email,
      this.password
    ).subscribe({

      next: (response: any) => {
    this.loginLoading = false;

    localStorage.setItem(
      'token',
      response.token
    );

    localStorage.setItem(
      'mfaVerified',
      'false'
    );

    if (response.user.mfaEnabled) {

      localStorage.setItem(
        'mfaVerified',
        'false'
      );

      this.router.navigate(['/mfa']);
      this.toast.info('MFA verification required', 'Enter your authenticator code to continue.');

    } else {

      localStorage.setItem(
        'mfaVerified',
        'true'
      );

      this.router.navigate(['/dashboard']);
      this.toast.success('Signed in', 'Welcome back to FarmOps.');

    }
  },

      error: (error) => {
        this.loginLoading = false;
        console.error('Login failed', error);
        this.toast.error('Login failed', error?.error?.message || 'Invalid email or password.');
      }

    });

  }

}
