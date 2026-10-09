import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification.service';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (loading.isLoading()) {
      <div class="progress-bar"></div>
    }
    <router-outlet></router-outlet>
    <div class="toast-stack">
      @for (toast of notify.toasts(); track toast.id) {
        <div class="toast" [class.toast--error]="toast.type === 'error'" [class.toast--success]="toast.type === 'success'">
          {{ toast.text }}
        </div>
      }
    </div>
  `,
  styles: [`
    .progress-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 200;
      background: var(--color-marigold);
      animation: progress-sweep 1.1s ease-in-out infinite;
      transform-origin: left;
    }
    @keyframes progress-sweep {
      0% { transform: scaleX(0); opacity: 1; }
      60% { transform: scaleX(0.7); }
      100% { transform: scaleX(1); opacity: 0; }
    }
  `],
})
export class AppComponent {
  notify = inject(NotificationService);
  loading = inject(LoadingService);
}
