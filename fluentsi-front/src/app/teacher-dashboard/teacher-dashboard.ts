import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './teacher-dashboard.html',
  styleUrls: ['./teacher-dashboard.css']
})
export class TeacherDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  // Datos del profesor
  nombreProfesor: string = '';
  teacherId: number | null = null;

  // Estadísticas
  alumnosAsignados: number = 0;
  sesionesPendientes: number = 0;

  // Próxima sesión
  proximaSesion: any = null;

  // UI
  cargando: boolean = true;

  private userSub: Subscription | null = null;
  private readonly API = 'http://localhost:4000/api';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.userSub = this.authService.user$.subscribe(user => {
      if (user) {
        const nombre = user.nombre || '';
        const apPaterno = user.ap_paterno || '';
        this.nombreProfesor = apPaterno ? `${nombre} ${apPaterno}` : nombre;
        this.teacherId = Number(user.userId ?? user.id_instructor ?? user.id ?? null) || null;
        this.cdr.detectChanges();

        if (this.teacherId) {
          this.cargarStats();
          this.cargarProximaSesion();
        } else {
          this.cargando = false;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  cargarStats(): void {
    this.http.get<any>(`${this.API}/teacher/${this.teacherId}/stats`).subscribe({
      next: (data) => {
        this.alumnosAsignados = data.alumnosAsignados ?? 0;
        this.sesionesPendientes = data.sesionesPendientes ?? 0;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // El endpoint aún no existe – usamos 0 mientras tanto
        this.alumnosAsignados = 0;
        this.sesionesPendientes = 0;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarProximaSesion(): void {
    this.http.get<any>(`${this.API}/teacher/${this.teacherId}/next-session`).subscribe({
      next: (data) => {
        this.proximaSesion = data ?? null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.proximaSesion = null;
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}