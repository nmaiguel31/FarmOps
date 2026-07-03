import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideShieldAlert } from '@lucide/angular';

@Component({
  selector: 'app-access-denied',
  imports: [
    RouterModule,
    LucideShieldAlert
  ],
  templateUrl: './access-denied.html',
  styleUrl: './access-denied.css'
})
export class AccessDenied {}
