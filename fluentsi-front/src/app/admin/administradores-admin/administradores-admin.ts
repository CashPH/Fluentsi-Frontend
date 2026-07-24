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

  nuevoAdmin: any = { nombre: '', correo: '', password: '', privilegios: 1 };

  ngOnInit() {
    this.cargarAdministradores();
  }

  cargarAdministradores() {
    this.dashboardService.getAdministradores().subscribe({
      next: (response) => {
        if (response.success) {
          this.administradores = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error cargando admins', err)
    });
  }

abrirModalNuevo() {
    this.modoEdicion = false;
    this.nuevoAdmin = { nombre: '', correo: '', password: '', privilegios: 1 };
    this.mostrarModal = true;
  }

  abrirModalEditar(admin: any) {
    this.modoEdicion = true;
    this.idSeleccionado = admin.id_admin;
    this.nuevoAdmin = { ...admin, password: '' }; 
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarAdministrador() {
    if (!this.nuevoAdmin.nombre || !this.nuevoAdmin.correo) {
      alert('Nombre y Correo son obligatorios.');
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