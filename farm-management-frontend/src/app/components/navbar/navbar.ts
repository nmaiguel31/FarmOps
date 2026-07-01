import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { clearAuthSession } from '../../guards/auth-guard';
import { Auth } from '../../services/auth';
import {
  LucideBadgeDollarSign,
  LucideCloudSun,
  LucideFileText,
  LucideLayoutDashboard,
  LucideLeaf,
  LucideLogOut,
  LucideMap,
  LucideUserRound,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideSprout
} from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterModule,
    LucideBadgeDollarSign,
    LucideCloudSun,
    LucideFileText,
    LucideLayoutDashboard,
    LucideLeaf,
    LucideLogOut,
    LucideMap,
    LucideUserRound,
    LucideShieldAlert,
    LucideShieldCheck,
    LucideSprout
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private router = inject(Router);
  private authService = inject(Auth);

  get displayName() {
    const user = this.authService.getCurrentUser();
    return user?.fullName?.trim() || user?.email || 'Profile';
  }

  get displayInitials() {
    return this.authService.getInitials().toUpperCase();
  }

  logout() {

    clearAuthSession();
    this.authService.setCurrentUser(null);

    this.router.navigate(['/login']);

  }
}
