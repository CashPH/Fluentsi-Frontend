import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login-admin.html',
  styleUrls: ['./login-admin.css']
})
export class LoginAdmin {
  private http = inject(HttpClient);
  private router = inject(Router);

  credenciales = {
    usuario: '',
    password: ''
  };

  mensajeError: string = '';
  cargando: boolean = false;

  iniciarSesion() {
    // Validación rápida
    if (!this.credenciales.usuario || !this.credenciales.password) {
      this.mensajeError = 'Por favor, llena todos los campos.';
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    // Llamada al backend
    this.http.post('http://localhost:4000/api/auth/login', this.credenciales).subscribe({
      next: (response: any) => {
        // 1. Guardamos todo en el localStorage
        localStorage.setItem('admin_token', response.token);
        localStorage.setItem('admin_nombre', response.nombre);
        localStorage.setItem('admin_privilegios', JSON.stringify(response.privilegios));
        
        // 2. Redirigimos al dashboard
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        // Mostramos el error que nos escupa el backend (ej. "Credenciales inválidas")
        this.mensajeError = err.error?.message || 'Error al conectar con el servidor.';
      }
    });
  }
}