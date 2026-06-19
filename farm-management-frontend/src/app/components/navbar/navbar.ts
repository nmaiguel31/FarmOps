import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private router = inject(Router);

  logout() {

    localStorage.removeItem('token');

    localStorage.removeItem('mfaVerified');

    localStorage.removeItem('mfaVerifiedAt');

    this.router.navigate(['/']);

  }
}