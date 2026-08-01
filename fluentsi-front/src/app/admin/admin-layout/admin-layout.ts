import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css'] // Asegúrate de que el nombre del CSS coincida
})
export class AdminLayout implements OnInit {
  permisos: any = {};
  nombreAdmin: string = 'Administrador';
  private router = inject(Router);

  ngOnInit() {
    // 1. Buscamos los permisos guardados en el navegador
    const privilegiosGuardados = localStorage.getItem('admin_privilegios');
    const nombreGuardado = localStorage.getItem('admin_nombre');
    
    if (privilegiosGuardados) {
      this.permisos = JSON.parse(privilegiosGuardados);
    }
    
    if (nombreGuardado) {
      this.nombreAdmin = nombreGuardado;
    }
  }

  cerrarSesion() {
    // Borramos todo rastro del güey en la compu
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_privilegios');
    localStorage.removeItem('admin_nombre');
    
    
    this.router.navigate(['/admin/login']); 
  }
}