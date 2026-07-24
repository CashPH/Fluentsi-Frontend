import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './main-dashboard.html',
  styleUrls: ['./main-dashboard.css']
})
export class MainDashboard implements OnInit {
  private dashboardService = inject(DashboardService);
  private cdr = inject(ChangeDetectorRef); 

  totalAlumnos: number = 0;
  instructoresActivos: number = 0;
  gruposActivos: number = 0;
  
  prospectosRecientes: any[] = [];

  ngOnInit() {
    this.cargarMetricas();
    this.cargarProspectos();
  }

  cargarMetricas() {
    this.dashboardService.getMetrics().subscribe({
      next: (response) => {
        if (response.success) {
          this.totalAlumnos = response.data.totalAlumnos;
          this.instructoresActivos = response.data.instructoresActivos;
          this.gruposActivos = response.data.gruposActivos;
          
          
          this.cdr.detectChanges(); 
        } else {
          console.warn('Llegaron datos, pero success no es true');
        }
      },
      error: (err) => console.error('Error cargando métricas', err)
    });
  }

  cargarProspectos() {
    this.dashboardService.getProspectosRecientes().subscribe({
      next: (response) => {
        if (response.success) {
          this.prospectosRecientes = response.data;
          
          
          this.cdr.detectChanges(); 
        }
      },
      error: (err) => console.error('Error cargando prospectos', err)
    });
  }
}