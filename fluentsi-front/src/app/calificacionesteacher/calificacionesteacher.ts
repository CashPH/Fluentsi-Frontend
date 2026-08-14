import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export interface Alumno {
  idAlumno?: string;
  nombreAlumno: string;
  avatarUrl?: string;
  grupo?: string;
}

@Component({
  selector: 'app-calificacionesteacher',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './calificacionesteacher.html',
  styleUrls: ['./calificacionesteacher.css']
})
export class Calificacionesteacher implements OnInit {
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  grupoSeleccionado: string = 'Clase 1';
  grupos: string[] = ['Clase 1', 'Clase 2', 'Clase 3'];

  alumno: Alumno = {
    idAlumno: '1',
    nombreAlumno: 'Selecciona un alumno',
    avatarUrl: 'assets/monit.png',
    grupo: 'Clase 1'
  };

  evaluacionCursos: string = '';
  evaluacionExamenes: string = '';
  evaluacionGeneral: string = '';

  comentarios: string = '';
  guardando: boolean = false;
  mensajeExito: string = '';
  mensajeError: string = '';

  instructorId: number | null = null;

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.instructorId = Number(user.userId ?? user.id_instructor ?? null) || null;
    }

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { alumnoData: Alumno };

    if (state && state.alumnoData) {
      this.alumno = state.alumnoData;
      if (this.alumno.grupo) {
        this.grupoSeleccionado = this.alumno.grupo;
      }
      // Cargar calificación existente si existe
      this.cargarCalificacionExistente();
    } else {
      const stateHistory = history.state?.alumnoData;
      if (stateHistory) {
        this.alumno = stateHistory;
        if (this.alumno.grupo) {
          this.grupoSeleccionado = this.alumno.grupo;
        }
        this.cargarCalificacionExistente();
      }
    }
  }

  private cargarCalificacionExistente(): void {
    if (!this.instructorId || !this.alumno.idAlumno) return;

    this.http.get<any>(
      `http://localhost:4000/api/calificaciones-desempenio/instructor/${this.instructorId}/estudiante/${this.alumno.idAlumno}`
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.evaluacionCursos = res.data.evaluacion_cursos || '';
          this.evaluacionExamenes = res.data.evaluacion_examenes || '';
          this.evaluacionGeneral = res.data.evaluacion_general || '';
          this.comentarios = res.data.comentarios || '';
        }
      },
      error: (err) => console.error('Error al cargar calificación:', err)
    });
  }

  seleccionarGrupo(grupo: string): void {
    this.grupoSeleccionado = grupo;
  }

  guardarCalificacion(): void {
    if (!this.evaluacionCursos || !this.evaluacionExamenes || !this.evaluacionGeneral) {
      this.mensajeError = 'Por favor selecciona una evaluación para Cursos, Exámenes y Desempeño General antes de enviar.';
      setTimeout(() => { this.mensajeError = ''; }, 3000);
      return;
    }

    if (!this.instructorId || !this.alumno.idAlumno) {
      this.mensajeError = 'Error: No se pudo identificar al profesor o al alumno.';
      setTimeout(() => { this.mensajeError = ''; }, 3000);
      return;
    }

    this.guardando = true;

    const payload = {
      id_instructor: this.instructorId,
      id_estudiante: this.alumno.idAlumno,
      evaluacion_cursos: this.evaluacionCursos,
      evaluacion_examenes: this.evaluacionExamenes,
      evaluacion_general: this.evaluacionGeneral,
      comentarios: this.comentarios
    };

    this.http.post('http://localhost:4000/api/calificaciones-desempenio', payload).subscribe({
      next: (res: any) => {
        this.guardando = false;
        this.mensajeExito = '¡Calificación guardada exitosamente!';
        setTimeout(() => {
          this.mensajeExito = '';
          this.router.navigate(['/calificaciones-instructor']);
        }, 1500);
      },
      error: (err) => {
        this.guardando = false;
        this.mensajeError = 'Error al guardar la calificación. Intenta de nuevo.';
        console.error('Error al guardar calificación:', err);
        setTimeout(() => { this.mensajeError = ''; }, 3000);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}