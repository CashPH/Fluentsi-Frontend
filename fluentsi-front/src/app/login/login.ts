import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

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
  loginType: 'student' | 'teacher' = 'student';

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

  setLoginType(type: 'student' | 'teacher'): void {
    this.loginType = type;
    this.error = null;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.error = 'Por favor completa correctamente todos los campos';
      return;
    }

    this.loading = true;
    this.error = null;

    const { correo, password } = this.loginForm.value;

    const loginRequest = this.loginType === 'student'
      ? this.authService.loginStudent(correo, password)
      : this.authService.loginTeacher(correo, password);

    loginRequest.subscribe({
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
        this.error = error.error?.message || 'Credenciales inválidas';
        
        Swal.fire({
          icon: 'error',
          title: 'Credenciales Inválidas',
          text: this.error || 'Por favor verifica tu correo y contraseña.',
          confirmButtonColor: '#1712a4',
          confirmButtonText: 'Aceptar'
        });

        console.error('Login error:', error);
      }
    });
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
