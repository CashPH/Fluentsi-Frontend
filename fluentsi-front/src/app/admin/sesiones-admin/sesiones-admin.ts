import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-sesiones-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sesiones-admin.html',
  styleUrls: ['./sesiones-admin.css']
})
export class SesionesAdminComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  sesiones: any[] = [];
  instructores: any[] = [];
  estudiantes: any[] = [];

  mostrarModal = false;
  modoEdicion = false;
  sesionSeleccionadaId: number | null = null;

  formulario = {
    id_instructor: 0,
    estudiantes_ids: [] as number[],
    fecha: '',
    hora: '',
    objetivo: '',
    notas: '',
    estado: 'programada'
  };

  cargando = true;
  mensajeExito = '';
  mensajeError = '';

  filtroEstado: string = 'programada';

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    let sesionesOk = false;
    let instructoresOk = false;
    let estudiantesOk = false;

    const verificar = () => {
      if (sesionesOk && instructoresOk && estudiantesOk) {
        this.cargando = false;
        this.cdr.detectChanges();
      }
    };

    this.dashboardService.getSesiones().subscribe({
      next: (r) => { this.sesiones = r.data || []; sesionesOk = true; verificar(); },
      error: () => { sesionesOk = true; verificar(); }
    });

    this.dashboardService.getInstructores().subscribe({
      next: (r) => { this.instructores = r.data || []; instructoresOk = true; verificar(); },
      error: () => { instructoresOk = true; verificar(); }
    });

    this.dashboardService.getEstudiantes().subscribe({
      next: (r) => { this.estudiantes = r.data || []; estudiantesOk = true; verificar(); },
      error: () => { estudiantesOk = true; verificar(); }
    });
  }

  get sessionesFiltradas() {
    if (this.filtroEstado === 'todas') return this.sesiones;
    return this.sesiones.filter(s => s.estado === this.filtroEstado);
  }

  isEstudianteSeleccionado(id: number): boolean {
    return this.formulario.estudiantes_ids.includes(id);
  }

  toggleEstudiante(id: number): void {
    if (this.isEstudianteSeleccionado(id)) {
      this.formulario.estudiantes_ids = this.formulario.estudiantes_ids.filter(eId => eId !== id);
    } else {
      this.formulario.estudiantes_ids.push(id);
    }
  }

  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.sesionSeleccionadaId = null;
    this.mensajeError = '';
    this.formulario = {
      id_instructor: 0,
      estudiantes_ids: [],
      fecha: '',
      hora: '',
      objetivo: '',
      notas: '',
      estado: 'programada'
    };
    this.mostrarModal = true;
  }

  abrirModalEditar(sesion: any): void {
    this.modoEdicion = true;
    this.sesionSeleccionadaId = sesion.id_sesion;
    this.mensajeError = '';

    let eIds: number[] = [];
    if (sesion.estudiantes_ids) {
      if (typeof sesion.estudiantes_ids === 'string') {
        eIds = sesion.estudiantes_ids.split(',').map((id: string) => Number(id.trim())).filter((id: number) => !isNaN(id));
      } else if (Array.isArray(sesion.estudiantes_ids)) {
        eIds = sesion.estudiantes_ids.map(Number);
      }
    }

    this.formulario = {
      id_instructor: sesion.id_instructor,
      estudiantes_ids: eIds,
      fecha: sesion.fecha?.split('T')[0] || sesion.fecha,
      hora: sesion.hora?.substring(0, 5) || '',
      objetivo: sesion.objetivo || '',
      notas: sesion.notas || '',
      estado: sesion.estado || 'programada'
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  guardarSesion(): void {
    if (!this.formulario.id_instructor ||
      this.formulario.estudiantes_ids.length === 0 ||
      !this.formulario.fecha || !this.formulario.hora) {
      this.mensajeError = 'Debes seleccionar instructor, al menos un alumno, fecha y hora.';
      return;
    }

    const datos = {
      id_instructor: Number(this.formulario.id_instructor),
      estudiantes_ids: this.formulario.estudiantes_ids,
      fecha: this.formulario.fecha,
      hora: this.formulario.hora,
      objetivo: this.formulario.objetivo,
      notas: this.formulario.notas,
      estado: this.formulario.estado
    };

    if (this.modoEdicion && this.sesionSeleccionadaId) {
      this.dashboardService.actualizarSesion(this.sesionSeleccionadaId, datos).subscribe({
        next: () => {
          this.cerrarModal();
          this.mostrarExito('Sesión actualizada con éxito');
          this.cargarDatos();
        },
        error: (err) => { this.mensajeError = err.error?.error || 'Error al actualizar'; }
      });
    } else {
      this.dashboardService.crearSesion(datos).subscribe({
        next: () => {
          this.cerrarModal();
          this.mostrarExito('¡Sesión creada con éxito!');
          this.cargarDatos();
        },
        error: (err) => { this.mensajeError = err.error?.error || 'Error al crear la sesión'; }
      });
    }
  }

  cancelarSesion(sesion: any): void {
    const alumnosInfo = sesion.nombres_alumnos || 'los alumnos';
    const fechaFormateada = this.formatearFecha(sesion.fecha);
    if (!confirm(`¿Cancelar la sesión del ${fechaFormateada} a las ${sesion.hora} con ${alumnosInfo}?`)) return;

    this.dashboardService.cancelarSesion(sesion.id_sesion).subscribe({
      next: () => {
        this.mostrarExito('Sesión cancelada.');
        this.cargarDatos();
      },
      error: () => alert('Error al cancelar la sesión.')
    });
  }

  getEstadoClass(estado: string): string {
    return { programada: 'badge-programada', completada: 'badge-completada', cancelada: 'badge-cancelada' }[estado] || '';
  }

  private mostrarExito(msg: string): void {
    this.mensajeExito = msg;
    setTimeout(() => { this.mensajeExito = ''; this.cdr.detectChanges(); }, 3000);
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    const dateOnly = typeof fecha === 'string' ? fecha.split('T')[0] : '';
    if (!dateOnly) return '';
    const [year, month, day] = dateOnly.split('-').map(Number);
    if (!year || !month || !day) return 'Fecha no válida';
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return 'Fecha no válida';
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
}
