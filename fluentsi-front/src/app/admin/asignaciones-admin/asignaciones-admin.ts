import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-asignaciones-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignaciones-admin.html',
  styleUrls: ['./asignaciones-admin.css']
})
export class AsignacionesAdminComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  asignaciones: any[] = [];
  instructores: any[] = [];
  estudiantes: any[] = [];

  mostrarModal = false;
  nuevaAsignacion = { id_instructor: 0, id_estudiante: 0 };

  // UI
  cargando = true;
  mensajeExito = '';
  mensajeError = '';

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    let instructoresCargados = false;
    let asignacionesCargadas = false;
    let estudiantesCargados = false;

    const verificar = () => {
      if (instructoresCargados && asignacionesCargadas && estudiantesCargados) {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    };

    this.dashboardService.getInstructores().subscribe({
      next: (r) => { this.instructores = r.data || []; instructoresCargados = true; verificar(); },
      error: () => { instructoresCargados = true; verificar(); }
    });

    this.dashboardService.getAsignaciones().subscribe({
      next: (r) => { this.asignaciones = r.data || []; asignacionesCargadas = true; verificar(); },
      error: () => { asignacionesCargadas = true; verificar(); }
    });

    this.dashboardService.getEstudiantes().subscribe({
      next: (r) => { this.estudiantes = r.data || []; estudiantesCargados = true; verificar(); },
      error: () => { estudiantesCargados = true; verificar(); }
    });
  }

  // Agrupa asignaciones por instructor para mostrar la tabla
  get instructoresConAlumnos() {
    return this.instructores.map(inst => ({
      ...inst,
      alumnos: this.asignaciones.filter(a => a.id_instructor === inst.id_instructor)
    }));
  }

  // Alumnos que aún no están asignados al instructor seleccionado en el modal
  get estudiantesDisponibles() {
    if (!this.nuevaAsignacion.id_instructor) return this.estudiantes;
    const asignadosIds = new Set(
      this.asignaciones
        .filter(a => a.id_instructor === this.nuevaAsignacion.id_instructor)
        .map(a => a.id_estudiante)
    );
    return this.estudiantes.filter(e => !asignadosIds.has(e.id_estudiante));
  }

  abrirModal(): void {
    this.nuevaAsignacion = { id_instructor: 0, id_estudiante: 0 };
    this.mensajeError = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarAsignacion(): void {
    if (!this.nuevaAsignacion.id_instructor || !this.nuevaAsignacion.id_estudiante) {
      this.mensajeError = 'Debes seleccionar un instructor y un alumno.';
      return;
    }

    this.dashboardService.crearAsignacion({
      id_instructor: Number(this.nuevaAsignacion.id_instructor),
      id_estudiante: Number(this.nuevaAsignacion.id_estudiante)
    }).subscribe({
      next: () => {
        this.cerrarModal();
        this.mostrarExito('¡Alumno asignado con éxito!');
        this.cargarDatos();
      },
      error: (err) => {
        this.mensajeError = err.error?.error || 'Error al asignar el alumno.';
      }
    });
  }

  eliminarAsignacion(idAsignacion: number, nombreAlumno: string): void {
    if (!confirm(`¿Desasignar a ${nombreAlumno} de este instructor?`)) return;

    this.dashboardService.eliminarAsignacion(idAsignacion).subscribe({
      next: () => {
        this.mostrarExito('Asignación eliminada.');
        this.cargarDatos();
      },
      error: () => alert('Error al eliminar la asignación.')
    });
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = ''; this.cdr.detectChanges(); }, 3000);
  }

  nombreCompleto(persona: any, prefijo = 'nombre'): string {
    return `${persona[prefijo] || ''} ${persona['ap_' + prefijo.replace('nombre', 'paterno')] || ''}`.trim();
  }
}
