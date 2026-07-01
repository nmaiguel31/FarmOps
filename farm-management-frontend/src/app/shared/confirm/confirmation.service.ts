import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  confirmDestructive(title: string, consequence: string): boolean {
    return window.confirm(`${title}\n\n${consequence}`);
  }
}
