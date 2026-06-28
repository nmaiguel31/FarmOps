import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { clearAuthSession } from '../../guards/auth-guard';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule],
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
