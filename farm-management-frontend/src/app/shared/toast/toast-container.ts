import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideInfo,
  LucideTriangleAlert,
  LucideX
} from '@lucide/angular';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [
    CommonModule,
    LucideAlertCircle,
    LucideCheckCircle2,
    LucideInfo,
    LucideTriangleAlert,
    LucideX
  ],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css'
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
  readonly toasts$ = this.toastService.toasts$;
}
