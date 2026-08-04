import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

export interface Leccion {
  id: number;
  titulo: string;
  tipo: 'leccion' | 'quiz';
  completada: boolean;
}

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './course-viewer.html',
  styleUrls: ['./course-viewer.css']
})
export class CourseViewerComponent {
  private router = inject(Router);

  indiceActivo: number = 0;

  lecciones: Leccion[] = [
    { id: 1, titulo: 'Tag Questions', tipo: 'leccion', completada: false },
    { id: 2, titulo: 'Quiz: Tag Questions', tipo: 'quiz', completada: false }
  ];

  get leccionActual(): Leccion {
    return this.lecciones[this.indiceActivo];
  }

  seleccionarLeccion(index: number): void {
    this.indiceActivo = index;
  }

  leccionAnterior(): void {
    if (this.indiceActivo > 0) {
      this.indiceActivo--;
    }
  }

  leccionSiguiente(): void {
    if (this.indiceActivo < this.lecciones.length - 1) {
      this.indiceActivo++;
    }
  }

  cerrarVisor(): void {
    this.router.navigate(['/cursos']);
  }

  // MÉTODO PARA EL LOGOUT
  logout(): void {
    // 1. Limpiar token o datos guardados (opcional según tu proyecto)
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');

    // 2. Redirigir a la pantalla de login (cambia '/login' si tu ruta se llama distinto)
    this.router.navigate(['/login']); 
  }
}