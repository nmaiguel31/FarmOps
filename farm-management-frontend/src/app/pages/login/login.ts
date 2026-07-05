import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../services/auth';
import { ToastService } from '../../shared/toast/toast.service';

type LoginSloganLine = {
  text: string;
  accent?: string;
};

type LoginSlogan = {
  lines: LoginSloganLine[];
};

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
  selectedHero = '';
  selectedSlogan: LoginSlogan = {
    lines: [
      { text: 'Manage smarter.' },
      { text: 'Farm ', accent: 'better.' },
      { text: 'Grow ', accent: 'sustainably.' }
    ]
  };

  private authService = inject(Auth);
  private router = inject(Router);
  private toast = inject(ToastService);
  private readonly lastHeroKey = 'farmops:last-login-hero';
  private readonly heroImages = [
    '/assets/login-heroes/hero-wheat-sunrise.png',
    '/assets/login-heroes/hero-tractor.png',
    '/assets/login-heroes/hero-corn-field.png',
    '/assets/login-heroes/hero-drone-crops.png',
    '/assets/login-heroes/hero-irrigation.png',
    '/assets/login-heroes/hero-seedlings.png',
    '/assets/login-heroes/hero-vineyard.png',
    '/assets/login-heroes/hero-harvest.png',
    '/assets/login-heroes/hero-greenhouse.png',
    '/assets/login-heroes/hero-farm-command-center.png',
    '/assets/login-heroes/hero-smart-farm-headquarters.png'
  ];
  private readonly slogans: LoginSlogan[] = [
    {
      lines: [
        { text: 'Manage smarter.' },
        { text: 'Farm ', accent: 'better.' },
        { text: 'Grow ', accent: 'sustainably.' }
      ]
    },
    {
      lines: [
        { text: 'Monitor every field.' },
        { text: 'Act with ', accent: 'confidence.' },
        { text: 'Grow ', accent: 'better.' }
      ]
    },
    {
      lines: [
        { text: 'From planting to harvest.' },
        { text: 'One ', accent: 'workspace.' },
        { text: 'Better ', accent: 'decisions.' }
      ]
    },
    {
      lines: [
        { text: 'Turn farm data into action.' },
        { text: 'Faster.' },
        { text: 'Smarter. ', accent: 'Cleaner.' }
      ]
    },
    {
      lines: [
        { text: 'See your operations clearly.' },
        { text: 'Manage with ', accent: 'confidence.' },
        { text: 'Grow with ', accent: 'clarity.' }
      ]
    }
  ];

  constructor() {
    this.selectLoginHero();
  }

  get heroBackgroundImage() {
    return `url("${this.selectedHero}")`;
  }

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

  private selectLoginHero() {
    const lastHero =
      localStorage.getItem(this.lastHeroKey);
    const availableHeroes =
      this.heroImages.filter(hero => hero !== lastHero);
    const heroPool =
      availableHeroes.length ? availableHeroes : this.heroImages;
    const heroIndex =
      Math.floor(Math.random() * heroPool.length);
    const selectedHero =
      heroPool[heroIndex] || this.heroImages[0];
    const sloganIndex =
      this.heroImages.indexOf(selectedHero);

    this.selectedHero = selectedHero;
    this.selectedSlogan =
      this.slogans[sloganIndex % this.slogans.length] || this.slogans[0];
    localStorage.setItem(this.lastHeroKey, selectedHero);
    this.preloadImage(selectedHero);
  }

  private preloadImage(src: string) {
    const image = new Image();
    image.src = src;
  }

}
