import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-instructores-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instructores-admin.html',
  styleUrls: ['./instructores-admin.css']
})
export class InstructoresAdminComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  instructores: any[] = [];
  mostrarModal: boolean = false;
  modoEdicion: boolean = false; 
  idSeleccionado: number = 0; 

  nuevoInstructor: any = {
    nombre: '', ap_paterno: '', ap_materno: '', correo: '', num_telefono: ''
  };

  ngOnInit() {
    this.cargarInstructores();
  }

  cargarInstructores() {
    this.dashboardService.getInstructores().subscribe({
      next: (response) => {
        if (response.success) {
          this.instructores = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando instructores', err)
    });
  }

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.nuevoInstructor = { nombre: '', ap_paterno: '', ap_materno: '', correo: '', num_telefono: '' };
    this.mostrarModal = true;
  }

  
  abrirModalEditar(instructor: any) {
    this.modoEdicion = true;
    this.idSeleccionado = instructor.id_instructor;
    
    this.nuevoInstructor = { ...instructor }; 
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarInstructor() {
    if (!this.nuevoInstructor.nombre || !this.nuevoInstructor.ap_paterno || !this.nuevoInstructor.correo) {
      alert('Nombre, Apellido Paterno y Correo son obligatorios.');
      return;
    }

    if (this.modoEdicion) {
      
      this.dashboardService.actualizarInstructor(this.idSeleccionado, this.nuevoInstructor).subscribe({
        next: (response) => {
          if (response.success) {
            this.cerrarModal();
            this.cargarInstructores();
          }
        },
        error: (err) => alert('Error al actualizar')
      });
    } else {
      
      this.dashboardService.crearInstructor(this.nuevoInstructor).subscribe({
        next: (response) => {
          if (response.success) {
            this.cerrarModal();
            this.cargarInstructores();
          }
        },
        error: (err) => alert('Error al guardar')
      });
    }
  }

  
  eliminarInstructor(id: number) {
    
    if (confirm('¿Estás seguro de que quieres eliminar a este instructor? Esta acción no se puede deshacer.')) {
      this.dashboardService.eliminarInstructor(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarInstructores(); 
          }
        },
        error: (err) => alert('Error al eliminar')
      });
    }
  }
}