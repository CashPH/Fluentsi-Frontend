import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-courses',
  imports: [CommonModule],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class CoursesComponent {
  niveles = ['-A1', 'A1', 'A2', 'B1', 'B2', 'C1'];
  etiquetas = ['Test', 'Inglés', 'Principiante', 'Avanzado'];

  cursos = [
    { nivel: 'A1', titulo: 'Nouns Level 1', img: 'assets/curso1.jpg' },
    { nivel: '-A1', titulo: 'Curso 1', img: 'assets/curso2.jpg' },
    { nivel: 'B1', titulo: 'Curso 2', img: 'assets/curso3.jpg' },
    { nivel: 'C1', titulo: 'Curso 3', img: 'assets/curso4.jpg' },
    { nivel: 'B2', titulo: 'Curso 4', img: 'assets/curso5.jpg' },
    { nivel: 'A2', titulo: 'Curso 5', img: 'assets/curso6.jpg' }
  ];
}