import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  registerForm!: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  initForm(): void {
    this.registerForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      ap_paterno: ['', [Validators.required, Validators.minLength(2)]],
      ap_materno: ['', []],
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.error = 'Por favor completa correctamente todos los campos';
      return;
    }

    this.loading = true;
    this.error = null;

    const { nombre, ap_paterno, ap_materno, correo, password } = this.registerForm.value;

    this.authService.registerStudent({ nombre, ap_paterno, ap_materno, correo, password }).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.success = true;
        setTimeout(() => {
          this.router.navigate(['/student-dashboard']);
        }, 1500);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error en el registro. Intenta de nuevo.';
        console.error('Register error:', error);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
