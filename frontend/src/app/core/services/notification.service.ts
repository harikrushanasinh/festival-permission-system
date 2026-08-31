import { Injectable, signal } from '@angular/core';

export interface ToastMessage { id: number; type: 'success' | 'error' | 'info' | 'warning'; text: string; }

@Injectable({ providedIn: 'root' })
export class NotificationService {
  toasts = signal<ToastMessage[]>([]);
  private counter = 0;

  show(text: string, type: ToastMessage['type'] = 'info'): void {
    const toast: ToastMessage = { id: ++this.counter, type, text };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), 4000);
  }
  success(text: string) { this.show(text, 'success'); }
  error(text: string) { this.show(text, 'error'); }
  dismiss(id: number): void { this.toasts.update((list) => list.filter((t) => t.id !== id)); }
}
