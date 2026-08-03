import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

  ngOnInit(): void {
  
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { alumnoData: Alumno };

    if (state && state.alumnoData) {
      this.alumno = state.alumnoData;
      if (this.alumno.grupo) {
        this.grupoSeleccionado = this.alumno.grupo;
      }
    } else {
      const stateHistory = history.state?.alumnoData;
      if (stateHistory) {
        this.alumno = stateHistory;
        if (this.alumno.grupo) {
          this.grupoSeleccionado = this.alumno.grupo;
        }
      }
    }
  }

  seleccionarGrupo(grupo: string): void {
    this.grupoSeleccionado = grupo;
  }

  guardarCalificacion(): void {
    if (!this.evaluacionCursos || !this.evaluacionExamenes || !this.evaluacionGeneral) {
      alert('Por favor selecciona una evaluación para Cursos, Exámenes y Desempeño General antes de enviar.');
      return;
    }

    const payload = {
      alumnoId: this.alumno.idAlumno,
      nombreAlumno: this.alumno.nombreAlumno,
      cursos: this.evaluacionCursos,
      examenes: this.evaluacionExamenes,
      general: this.evaluacionGeneral,
      comentarios: this.comentarios
    };

    console.log('Calificación enviada exitosamente para:', payload);
    
    this.router.navigate(['/calificaciones-instructor']);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}