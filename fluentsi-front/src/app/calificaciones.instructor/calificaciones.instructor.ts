import { Component, inject } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; 

export interface Alumno {
  idAlumno: string;
  nombreAlumno: string;
  avatarUrl: string;
  grupo: string;
}

@Component({
  selector: 'app-calificaciones-instructor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calificaciones.instructor.html',
  styleUrls: ['./calificaciones.instructor.css']
})
export class CalificacionesInstructor {

 
  private router = inject(Router);

  grupoSeleccionado: string = 'Clase 1';
  grupos: string[] = ['Clase 1', 'Clase 2', 'Clase 3'];

  alumnosTotales: Alumno[] = [
    { idAlumno: '1', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 1' },
    { idAlumno: '2', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 1' },
    { idAlumno: '3', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 1' },
    { idAlumno: '4', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 1' },
    { idAlumno: '5', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 2' },
    { idAlumno: '6', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 2' },
    { idAlumno: '7', nombreAlumno: 'Nombre del alumn@', avatarUrl: '/m.png', grupo: 'Clase 3' }
  ];


  logout(): void {
    
    localStorage.clear();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  get alumnasFiltradas(): Alumno[] {
    return this.alumnosTotales.filter(alumno => alumno.grupo === this.grupoSeleccionado);
  }

  seleccionarGrupo(grupo: string): void {
    this.grupoSeleccionado = grupo;
  }

  calificarAlumno(alumno: Alumno): void {
    console.log('Iniciando calificación para:', alumno.nombreAlumno);
  }
}