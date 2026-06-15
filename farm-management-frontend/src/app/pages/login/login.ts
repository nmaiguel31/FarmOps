import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  email = '';
  password = '';

  private authService = inject(Auth);
  private router = inject(Router);

  onLogin() {

    this.authService.login(
      this.email,
      this.password
    ).subscribe({

      next: (response: any) => {

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

    } else {

      localStorage.setItem(
        'mfaVerified',
        'true'
      );

      this.router.navigate(['/dashboard']);

    }
  },

      error: (error) => {
        console.error('Login failed', error);
        alert('Invalid credentials');
      }

    });

  }

}