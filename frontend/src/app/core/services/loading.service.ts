import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  isLoading = signal(false);

  start(): void { this.pending++; this.isLoading.set(true); }
  stop(): void { this.pending = Math.max(0, this.pending - 1); this.isLoading.set(this.pending > 0); }
}
