import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class CoursesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  niveles = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  etiquetas = ['Test', 'Inglés', 'Francés'];

  cursos: any[] = [];
  isStudent: boolean = false;
  userId: number | null = null;
  inscritosIds: Set<number> = new Set<number>();
  cargando: boolean = true;

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user && user.role === 'student') {
      this.isStudent = true;
      this.userId = Number(user.userId ?? user.id_estudiante ?? null) || null;
      console.log('CoursesComponent user loaded:', user, 'resolved userId:', this.userId);
    }
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.cargando = true;

    if (this.isStudent && this.userId && this.userId > 0) {
      forkJoin({
        todos: this.http.get<any[]>('http://localhost:4000/api/cursos').pipe(catchError((error) => {
          console.error('CoursesComponent error loading cursos:', error);
          return of([]);
        })),
        inscritos: this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).pipe(catchError((error) => {
          console.error('CoursesComponent error loading inscripciones:', error);
          return of([]);
        }))
      }).subscribe(({ todos, inscritos }) => {
        this.cursos = todos;
        this.inscritosIds = new Set(inscritos.map((c: any) => c.id_curso));
        this.cargando = false;
        this.cdr.detectChanges();
      });
    } else {
      this.http.get<any[]>('http://localhost:4000/api/cursos').subscribe({
        next: (data) => {
          this.cursos = data;
          this.cargando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al cargar los cursos:', err);
          this.cargando = false;
        }
      });
    }
  }

  estaInscrito(idCurso: number): boolean {
    return this.inscritosIds.has(idCurso);
  }

  gestionarCurso(idCurso: number): void {
    if (!this.isStudent) {
      this.router.navigate(['/editar-curso', idCurso]);
    } else {
      if (this.estaInscrito(idCurso)) {
        this.router.navigate(['/leccion']);
      } else {
        this.inscribirse(idCurso);
      }
    }
  }

  inscribirse(idCurso: number): void {
    if (!this.userId) return;

    this.http.post('http://localhost:4000/api/inscripciones', {
      id_estudiante: this.userId,
      id_curso: idCurso
    }).subscribe({
      next: () => {
        this.inscritosIds.add(idCurso);
        this.cdr.detectChanges();
        alert('¡Te has inscrito al curso exitosamente!');
      },
      error: (err) => {
        console.error('Error al inscribirse:', err);
      }
    });
  }
}