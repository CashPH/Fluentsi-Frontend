import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-genda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.html',
  styleUrls: ['./agenda.css']
})
export class MyAgendaComponent {
  dias = [
    { nombre: 'Lunes 08', activo: true },
    { nombre: 'Martes 09', activo: false },
    { nombre: 'Miercoles 10', activo: false },
    { nombre: 'Jueves 11', activo: false },
    { nombre: 'Viernes 12', activo: false }
  ];

  clases = [
    { hora: '10:00', alumna: '<Nombre Alumna>', objetivo: 'Entrevista', nivel: 'B2', img: 'assets/alumna.jpg' },
    { hora: '11:00', alumna: '<Nombre Alumna>', objetivo: 'Entrevista', nivel: 'B2', img: 'assets/alumna.jpg' },
    { hora: '12:00', alumna: '<Nombre Alumna>', objetivo: 'Entrevista', nivel: 'B2', img: 'assets/alumna.jpg' }
  ];
}