import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-administradores-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './administradores-admin.html',
  styleUrls: ['./administradores-admin.css']
})
export class AdministradoresAdminComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef);

  administradores: any[] = [];
  mostrarModal: boolean = false;
  modoEdicion: boolean = false;
  idSeleccionado: number = 0;

  nuevoAdmin: any = { 
    nombre: '', 
    ap_paterno: '', 
    ap_materno: '', 
    correo: '', 
    correo_recuperacion: '', 
    password: '', 
    privilegios: {
      inicio: true,
      instructores: false,
      asignaciones: false,
      agenda: false,
      administradores: false,
      prospectos: false
    } 
  };

  ngOnInit() {
    this.cargarAdministradores();
  }

  cargarAdministradores() {
    this.dashboardService.getAdministradores().subscribe({
      next: (response) => {
        if (response.success) {
          this.administradores = response.data.map((admin: any) => {
            // Nos aseguramos de que los privilegios sean un objeto y no un string
            if (typeof admin.privilegios === 'string') {
              try { admin.privilegios = JSON.parse(admin.privilegios); } 
              catch (e) { admin.privilegios = {}; }
            }
            return admin;
          });
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando admins', err)
    });
  }

  abrirModalNuevo() {
    this.modoEdicion = false;
    this.nuevoAdmin = { 
      nombre: '', 
      ap_paterno: '', 
      ap_materno: '', 
      correo: '', 
      correo_recuperacion: '', 
      password: '', 
      privilegios: {
        inicio: true,
        instructores: false,
        asignaciones: false,
        agenda: false,
        administradores: false,
        prospectos: false
      } 
    };
    this.mostrarModal = true;
  }

  abrirModalEditar(admin: any) {
    this.modoEdicion = true;
    this.idSeleccionado = admin.id_admin;
    // Hacemos una copia profunda de los privilegios para no mutar la tabla antes de guardar
    this.nuevoAdmin = { 
      ...admin, 
      password: '',
      privilegios: { ...admin.privilegios } 
    }; 
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarAdministrador() {
    if (!this.nuevoAdmin.nombre || !this.nuevoAdmin.ap_paterno || !this.nuevoAdmin.correo) {
      alert('Nombre, Apellido Paterno y Correo (Usuario) son obligatorios.');
      return;
    }

    if (this.modoEdicion) {
      this.dashboardService.actualizarAdministrador(this.idSeleccionado, this.nuevoAdmin).subscribe({
        next: (response) => {
          if (response.success) {
            this.cerrarModal();
            this.cargarAdministradores();
          }
        },
        error: (err) => alert('Error al actualizar')
      });
    } else {
      if (!this.nuevoAdmin.password) {
        alert('Asigna una contraseña para el nuevo administrador.');
        return;
      }
      this.dashboardService.crearAdministrador(this.nuevoAdmin).subscribe({
        next: (response) => {
          if (response.success) {
            this.cerrarModal();
            this.cargarAdministradores();
          }
        },
        error: (err) => alert('Error al guardar')
      });
    }
  }

  eliminarAdministrador(id: number) {
    if (confirm('¿Estás seguro de que quieres eliminar a este administrador? Pierde acceso al sistema.')) {
      this.dashboardService.eliminarAdministrador(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.cargarAdministradores();
          }
        },
        error: (err) => alert('Error al eliminar')
      });
    }
  }
}