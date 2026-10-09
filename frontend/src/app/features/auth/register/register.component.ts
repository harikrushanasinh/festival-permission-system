import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <aside class="auth-shell__brand">
        <div class="auth-shell__mark">Festival Permission Register</div>
        <p class="auth-shell__tagline">File your mandal once. Every Aagman and Visarjan application after that starts from your saved details.</p>
        <p class="auth-shell__foot">Registration is reviewed before you can submit an application.</p>
      </aside>

      <div class="auth-shell__form">
        <div class="auth-card auth-card--wide">
          <p class="auth-card__eyebrow">Organizer registration</p>
          <h1 class="auth-card__title">Register your mandal</h1>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field-row">
              <div class="field">
                <label for="name">Your name</label>
                <input id="name" formControlName="name" type="text" placeholder="Full name" />
              </div>
              <div class="field">
                <label for="mobile">Mobile number</label>
                <input id="mobile" formControlName="mobile" type="tel" placeholder="9XXXXXXXXX" />
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="email">Email</label>
                <input id="email" formControlName="email" type="email" placeholder="you@mandal.org" />
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input id="password" formControlName="password" type="password" placeholder="At least 8 characters" />
                @if (form.controls.password.invalid && form.controls.password.touched) {
                  <p class="field__error">Password must be at least 8 characters.</p>
                }
              </div>
            </div>

            <div class="field">
              <label for="organizationName">Mandal / organization name</label>
              <input id="organizationName" formControlName="organizationName" type="text" placeholder="e.g. Shree Ganesh Mitra Mandal" />
            </div>

            <div class="field">
              <label for="address">Address</label>
              <input id="address" formControlName="address" type="text" placeholder="Street address" />
            </div>

            <div class="field-row">
              <div class="field">
                <label for="city">City</label>
                <input id="city" formControlName="city" type="text" placeholder="City" />
              </div>
              <div class="field">
                <label for="area">Area</label>
                <input id="area" formControlName="area" type="text" placeholder="Locality / area" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Submitting…' : 'Register' }}
            </button>
          </form>

          <p class="auth-card__foot">
            Already registered? <a routerLink="/auth/login" class="btn-text">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);

  submitting = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
    mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    organizationName: ['', Validators.required],
    address: ['', Validators.required],
    city: ['', Validators.required],
    area: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.auth.register(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.notify.success('Registration submitted. You can sign in now.');
        this.router.navigate(['/auth/login']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
