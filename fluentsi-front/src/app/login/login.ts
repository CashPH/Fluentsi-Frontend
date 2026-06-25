import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm!: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.initForm();
  }

  initForm(): void {
    this.loginForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.error = 'Por favor completa correctamente todos los campos';
      return;
    }

    this.loading = true;
    this.error = null;

    const { correo, password } = this.loginForm.value;

    this.authService.loginStudent(correo, password).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        if (response.role === 'teacher') {
          this.router.navigate(['/teacher-home']);
        } else {
          this.router.navigate(['/student-home']);
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Error en el login. Verifica tus credenciales.';
        console.error('Login error:', error);
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
