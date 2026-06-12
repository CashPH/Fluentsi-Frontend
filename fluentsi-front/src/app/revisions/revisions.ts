import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-revisions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revisions.html',
  styleUrls: ['./revisions.css']
})
export class RevisionsComponent {
  revisiones = [
    { nombre: '<Nombre Alumna>', tipo: 'Placement Test', nivel: 'B2', img: 'assets/alumna.jpg' },
    { nombre: '<Nombre Alumna>', tipo: 'Grammar Test', nivel: 'A1', img: 'assets/alumna.jpg' },
    { nombre: '<Nombre Alumna>', tipo: 'Writing Task', nivel: 'A2', img: 'assets/alumna.jpg' }
  ];
}