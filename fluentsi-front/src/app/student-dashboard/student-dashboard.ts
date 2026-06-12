import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.css']
})
export class StudentDashboardComponent {
  cursosActivos = [
    { titulo: 'Curso 1', nivel: 'B2', progreso: 45 },
    { titulo: 'Curso 2', nivel: 'A1', progreso: 80 },
    { titulo: 'Curso 3', nivel: '-A1', progreso: 30 }
  ];

  cursosDisponibles = [
    { titulo: 'Nouns Level 1', nivel: 'A1', img: 'assets/curso1.jpg' }
  ];
}