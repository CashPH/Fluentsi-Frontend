import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-revisions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './revisions.html',
  styleUrls: ['./revisions.css']
})
export class RevisionsComponent {
  revisionSeleccionada: any = null;

  revisiones = [
    { nombre: '<Nombre Alumna>', tipo: 'Placement Test', nivel: 'B2', img: '/monit.png' },
    { nombre: '<Nombre Alumna>', tipo: 'Grammar Test', nivel: 'A1', img: '/monit.png' },
    { nombre: '<Nombre Alumna>', tipo: 'Writing Task', nivel: 'A2', img: '/monit.png' }
  ];

  seleccionarRevision(item: any) {

    if (this.revisionSeleccionada && this.revisionSeleccionada.tipo === item.tipo) {
      this.revisionSeleccionada = null; 
    } else {
      this.revisionSeleccionada = {    
        ...item,
        pregunta: '¿Cuál es la conjugación correcta del verbo to be en pasado?',
        respuesta: 'They was playing soccer yesterday.'
      };
    }
  }

  enviarRetroalimentacion() {
    alert('Retroalimentación enviada con éxito');
    this.revisionSeleccionada = null; 
  }
}