import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  timestamp: Date;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private counter = 0;
  toasts = signal<ToastMessage[]>([]);

  show(title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', duration = 4500): void {
    const id = ++this.counter;
    const newToast: ToastMessage = {
      id,
      title,
      message,
      type,
      timestamp: new Date(),
      duration
    };

    this.toasts.update(list => [newToast, ...list]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(title: string, message: string, duration = 4000): void {
    this.show(title, message, 'success', duration);
  }

  error(title: string, message: string, duration = 6000): void {
    this.show(title, message, 'error', duration);
  }

  warning(title: string, message: string, duration = 5000): void {
    this.show(title, message, 'warning', duration);
  }

  info(title: string, message: string, duration = 4500): void {
    this.show(title, message, 'info', duration);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clearAll(): void {
    this.toasts.set([]);
  }
}
