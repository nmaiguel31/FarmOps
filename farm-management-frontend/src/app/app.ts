import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { ToastContainerComponent } from './shared/toast/toast-container';
import {
  hasActiveMfaSession,
  hasValidToken
} from './guards/auth-guard';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('farm-management-frontend');

  get isLoggedIn() {

  return hasValidToken() &&
         hasActiveMfaSession();

}

}

