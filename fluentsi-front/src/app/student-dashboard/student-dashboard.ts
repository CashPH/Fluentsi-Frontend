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
student() {
throw new Error('Method not implemented.');
}
goToAgenda() {
throw new Error('Method not implemented.');
}
goToRevisions() {
throw new Error('Method not implemented.');
}
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  nombreCompleto: string = '';
  userId: number | null = null;
  private userSubscription: Subscription | null = null;
  private datosYaCargados = false;

  // Stats
  totalCursos: number = 0;
  promedioProgreso: number = 0;

  // Cursos inscritos (con progreso)
  cursosActivos: any[] = [];

  // Cursos disponibles para inscribirse (los que no tiene)
  cursosDisponibles: any[] = [];

  // UI states
  cargando: boolean = true;
  inscribiendoCursoId: number | null = null;
  mensajeExito: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user) {
        const nombre = user.nombre || '';
        const apPaterno = user.ap_paterno || '';
        this.nombreCompleto = apPaterno ? `${nombre} ${apPaterno}` : nombre;
        this.userId = Number(user.userId ?? user.id_estudiante ?? user.id ?? null) || null;
        this.cdr.detectChanges();

        if (!this.datosYaCargados) {
          this.datosYaCargados = true;
          this.cargarDatos();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  cargarDatos(): void {
    this.cargando = true;
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

    // Cargar todos los cursos
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

    // Cargar inscripciones del estudiante
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
    if (!this.userId) return;
    this.inscribiendoCursoId = idCurso;
    this.cdr.detectChanges();

    this.http.post('http://localhost:4000/api/inscripciones', {
      id_estudiante: this.userId,
      id_curso: idCurso
    }).subscribe({
      next: () => {
        this.mensajeExito = '¡Te has inscrito al curso exitosamente!';
        this.inscribiendoCursoId = null;
        this.datosYaCargados = false;
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToCursos(): void {
    this.router.navigate(['/cursos']);
  }

  goToCursosStudent(): void {
    this.router.navigate(['/cursos-student']);
  }

  goToCursoViewer(idCurso: number): void {
    this.router.navigate(['/curso', idCurso]);
  }
}