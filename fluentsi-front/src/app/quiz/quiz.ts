import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz.html',
  styleUrls: ['./quiz.css']
})
export class QuizComponent {
  preguntasGrid = [1, 2, 3, 4, 5, 6, 7, 8];
  preguntaActual = 3;

  opciones = [
    { texto: 'I is very happy', seleccionada: false },
    { texto: 'She are busy', seleccionada: false },
    { texto: 'We are students', seleccionada: true }
  ];
}