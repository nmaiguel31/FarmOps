import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { clearAuthSession } from '../../guards/auth-guard';
import {
  LucideBadgeDollarSign,
  LucideCloudSun,
  LucideFileText,
  LucideLayoutDashboard,
  LucideLeaf,
  LucideLogOut,
  LucideMap,
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
    LucideShieldAlert,
    LucideShieldCheck,
    LucideSprout
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private router = inject(Router);

  logout() {

    clearAuthSession();

    this.router.navigate(['/login']);

  }
}
