import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <aside class="auth-shell__brand">
        <div class="auth-shell__mark">Festival Permission Register</div>
        <p class="auth-shell__tagline">Aagman and Visarjan permissions, routed to the right police station and tracked live on the day.</p>
        <p class="auth-shell__foot">A single register for organizers, police stations, and the public.</p>
      </aside>

      <div class="auth-shell__form">
        <div class="auth-card">
          <p class="auth-card__eyebrow">Sign in</p>
          <h1 class="auth-card__title">Welcome back</h1>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" formControlName="email" type="email" autocomplete="email" placeholder="you@mandal.org" />
              @if (form.controls.email.invalid && form.controls.email.touched) {
                <p class="field__error">Enter a valid email address.</p>
              }
            </div>

            <div class="field">
              <label for="password">Password</label>
              <input id="password" formControlName="password" type="password" autocomplete="current-password" placeholder="••••••••" />
              @if (form.controls.password.invalid && form.controls.password.touched) {
                <p class="field__error">Password is required.</p>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-block" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="auth-card__foot">
            New organizer? <a routerLink="/auth/register" class="btn-text">Register your mandal</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  submitting = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: ({ user }) => {
        // Only the organizer workspace exists so far (police/admin workspaces are a
        // follow-up module) - every role lands here for now.
        this.notify.success(`Welcome back, ${user.name.split(' ')[0]}.`);
        this.router.navigate(['/organizer']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
