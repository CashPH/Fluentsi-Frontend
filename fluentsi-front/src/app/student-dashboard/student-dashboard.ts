import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);

  nombreCompleto: string = 'Estudiante';
  userId: number | null = null;
  private userSubscription: Subscription | null = null;
  private datosYaCargados = false;

  totalCursos: number = 0;
  promedioProgreso: number = 0;

  cursosActivos: any[] = [];

  cursosDisponibles: any[] = [];

  cargando: boolean = true;
  inscribiendoCursoId: number | null = null;
  mensajeExito: string = '';

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.setUserData(user);
    }

    this.userSubscription = this.authService.user$.subscribe(u => {
      if (u) {
        this.setUserData(u);
      }
    });

    if (this.userId) {
      this.cargarDatos();
    } else {
      setTimeout(() => {
        if (!this.datosYaCargados) {
          this.cargarDatos();
        }
      }, 300);
    }
  }

  private setUserData(user: any): void {
    const nombre = user.nombre || '';
    const apPaterno = user.ap_paterno || '';
    this.nombreCompleto = apPaterno ? `${nombre} ${apPaterno}` : nombre || 'Estudiante';
    this.userId = Number(user.userId ?? user.id_estudiante ?? user.id ?? null) || null;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.datosYaCargados = true;
    this.cdr.detectChanges();

    let todosCargados = false;
    let inscritosCargados = false;
    let todosLista: any[] = [];
    let inscritosLista: any[] = [];

    const verificarCompleto = () => {
      if (todosCargados && inscritosCargados) {
        this.cursosActivos = inscritosLista;
        this.totalCursos = todosLista.length;

        if (inscritosLista.length > 0) {
          const suma = inscritosLista.reduce((acc: number, c: any) => acc + Number(c.porcentaje_avance || 0), 0);
          this.promedioProgreso = Math.round(suma / inscritosLista.length);
        } else {
          this.promedioProgreso = 0;
        }

        const idsInscritos = new Set(inscritosLista.map((c: any) => c.id_curso));
        this.cursosDisponibles = todosLista.filter(c => !idsInscritos.has(c.id_curso));
        this.cargando = false;
        this.cdr.detectChanges();
      }
    };


    this.http.get<any[]>('http://localhost:4000/api/cursos').subscribe({
      next: (data) => {
        todosLista = Array.isArray(data) ? data : [];
        todosCargados = true;
        verificarCompleto();
      },
      error: (err) => {
        console.error('Error al cargar cursos:', err);
        todosLista = [];
        todosCargados = true;
        verificarCompleto();
      }
    });

    if (this.userId && this.userId > 0) {
      this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).subscribe({
        next: (data) => {
          inscritosLista = Array.isArray(data) ? data : [];
          inscritosCargados = true;
          verificarCompleto();
        },
        error: (err) => {
          console.error('Error al cargar inscripciones:', err);
          inscritosLista = [];
          inscritosCargados = true;
          verificarCompleto();
        }
      });
    } else {
      inscritosLista = [];
      inscritosCargados = true;
      verificarCompleto();
    }
  }

  inscribirse(idCurso: number): void {
    if (!this.userId) {
      alert('Debes iniciar sesión como estudiante para inscribirte.');
      return;
    }
    this.inscribiendoCursoId = idCurso;
    this.cdr.detectChanges();

    this.http.post('http://localhost:4000/api/inscripciones', {
      id_estudiante: this.userId,
      id_curso: idCurso
    }).subscribe({
      next: () => {
        this.mensajeExito = '¡Te has inscrito al curso exitosamente!';
        this.inscribiendoCursoId = null;
        this.cargarDatos();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.mensajeExito = '';
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        console.error('Error al inscribirse:', err);
        this.inscribiendoCursoId = null;
        this.cdr.detectChanges();
      }
    });
  }

  displayNivel(nivel: string): string {
    if (!nivel) return 'A1';
    return nivel === 'C2' ? 'C+' : nivel;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToCursosStudent(): void {
    this.router.navigate(['/cursos-student']);
  }

  goToCursoViewer(idCurso: number): void {
    this.router.navigate(['/curso', idCurso]);
  }
}