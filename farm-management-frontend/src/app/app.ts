import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('farm-management-frontend');

  get isLoggedIn() {

  const token =
    localStorage.getItem('token');

  const mfaVerified =
    localStorage.getItem('mfaVerified');

  return !!token &&
         mfaVerified === 'true';

}

}

