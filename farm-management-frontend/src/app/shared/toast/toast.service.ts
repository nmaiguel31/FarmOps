import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type FarmOpsToast = {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
};

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastSubject =
    new BehaviorSubject<FarmOpsToast[]>([]);
  readonly toasts$ = this.toastSubject.asObservable();
  private nextId = 1;

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  show(type: ToastType, title: string, message?: string): void {
    const toast: FarmOpsToast = {
      id: this.nextId++,
      type,
      title,
      message
    };

    this.toastSubject.next([
      ...this.toastSubject.value,
      toast
    ]);

    window.setTimeout(() => this.dismiss(toast.id), 4200);
  }

  dismiss(id: number): void {
    this.toastSubject.next(
      this.toastSubject.value.filter(toast => toast.id !== id)
    );
  }
}
