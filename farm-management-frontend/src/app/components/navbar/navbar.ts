import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { clearAuthSession } from '../../guards/auth-guard';
import { Auth } from '../../services/auth';
import {
  canAccessRoute,
  ROLE_LABELS
} from '../../shared/rbac/roles';
import {
  LucideBadgeDollarSign,
  LucideCloudSun,
  LucideFileText,
  LucideLayoutDashboard,
  LucideLeaf,
  LucideLogOut,
  LucideMap,
  LucideScrollText,
  LucideUserRound,
  LucideShieldAlert,
  LucideShieldCheck,
  LucideSprout
} from '@lucide/angular';

type NavItem = {
  label: string;
  route: string;
  routeKey: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', routeKey: 'dashboard', icon: 'dashboard' },
  { label: 'Farms', route: '/farms', routeKey: 'farms', icon: 'farms' },
  { label: 'Crops', route: '/crops', routeKey: 'crops', icon: 'crops' },
  { label: 'Financial Records', route: '/financial-records', routeKey: 'financial-records', icon: 'finance' },
  { label: 'Operations', route: '/operations-center', routeKey: 'operations-center', icon: 'operations' },
  { label: 'Weather', route: '/weather', routeKey: 'weather', icon: 'weather' },
  { label: 'NDVI Analysis', route: '/ndvi', routeKey: 'ndvi', icon: 'ndvi' },
  { label: 'Reports', route: '/reports', routeKey: 'reports', icon: 'reports' },
  { label: 'User Management', route: '/users', routeKey: 'users', icon: 'profile' },
  { label: 'Audit Log', route: '/audit-log', routeKey: 'audit-log', icon: 'audit' },
  { label: 'Profile', route: '/profile', routeKey: 'profile', icon: 'profile' },
  { label: 'Security', route: '/mfa', routeKey: 'mfa', icon: 'security' }
];

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    RouterModule,
    LucideBadgeDollarSign,
    LucideCloudSun,
    LucideFileText,
    LucideLayoutDashboard,
    LucideLeaf,
    LucideLogOut,
    LucideMap,
    LucideScrollText,
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

  get roleLabel() {
    return ROLE_LABELS[this.authService.getCurrentRole()];
  }

  get roleAccentClass() {
    return `role-${this.authService.getCurrentRole()}`;
  }

  get navItems() {
    const role = this.authService.getCurrentRole();

    return NAV_ITEMS.filter(item =>
      item.routeKey === 'mfa'
        ? role === 'administrator'
        : canAccessRoute(role, item.routeKey)
    );
  }

  trackByRoute(_index: number, item: NavItem) {
    return item.route;
  }

  logout() {

    clearAuthSession();
    this.authService.setCurrentUser(null);

    this.router.navigate(['/login']);

  }
}
