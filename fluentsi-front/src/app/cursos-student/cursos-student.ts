import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Ajusta la ruta a tu AuthService si es diferente
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-cursos-student',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink],
  templateUrl: './cursos-student.html',
  styleUrl: './cursos-student.css',
})
export class CursosStudentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);

  niveles = ['A1', 'A2', 'B1', 'B2', 'C1', 'C1+'];
  etiquetas = ['Test', 'Inglés', 'Francés'];
  nivelesSeleccionados = new Set<string>();
  etiquetasSeleccionadas = new Set<string>();
  textoBusqueda = '';

  cursos: any[] = [];
  isStudent: boolean = true;
  userId: number | null = null;
  inscritosIds: Set<number> = new Set<number>();
  cargando: boolean = true;

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.isStudent = user.role === 'student';
      this.userId = Number(user.userId ?? user.id_estudiante ?? null) || null;
      console.log('CursosStudentComponent user loaded:', user, 'resolved userId:', this.userId);
    }
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.cargando = true;

    if (this.isStudent && this.userId && this.userId > 0) {
      forkJoin({
        todos: this.http.get<any[]>('http://localhost:4000/api/cursos').pipe(
          catchError((error) => {
            console.error('CursosStudentComponent error loading cursos:', error);
            return of([]);
          })
        ),
        inscritos: this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).pipe(
          catchError((error) => {
            console.error('CursosStudentComponent error loading inscripciones:', error);
            return of([]);
          })
        )
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

  get cursosFiltrados(): any[] {
    const texto = this.textoBusqueda.trim().toLowerCase();

    return this.cursos.filter((curso: any) => {
      const coincideTexto = !texto || String(curso.titulo || '').toLowerCase().includes(texto);
      const coincideNivel = this.nivelesSeleccionados.size === 0 || this.nivelesSeleccionados.has(curso.nivel_recomendado);
      const coincideEtiqueta = this.etiquetasSeleccionadas.size === 0 || this.coincideConEtiqueta(curso);
      return coincideTexto && coincideNivel && coincideEtiqueta;
    });
  }

  toggleNivel(nivel: string): void {
    if (this.nivelesSeleccionados.has(nivel)) {
      this.nivelesSeleccionados.delete(nivel);
    } else {
      this.nivelesSeleccionados.add(nivel);
    }
  }

  toggleEtiqueta(etiqueta: string): void {
    if (this.etiquetasSeleccionadas.has(etiqueta)) {
      this.etiquetasSeleccionadas.delete(etiqueta);
    } else {
      this.etiquetasSeleccionadas.add(etiqueta);
    }
  }

  private coincideConEtiqueta(curso: any): boolean {
    const idioma = this.obtenerEtiquetaIdioma(curso.id_idioma);
    const etiquetaCurso = this.obtenerEtiquetaCurso(curso);

    return Array.from(this.etiquetasSeleccionadas).some((etiqueta) => {
      return etiqueta === idioma || etiqueta === etiquetaCurso;
    });
  }

  private obtenerEtiquetaIdioma(idIdioma: any): string {
    return Number(idIdioma) === 2 ? 'Francés' : 'Inglés';
  }

  private obtenerEtiquetaCurso(curso: any): string {
    const titulo = String(curso.titulo || '').toLowerCase();
    return titulo.includes('test') ? 'Test' : '';
  }

  estaInscrito(idCurso: number): boolean {
    return this.inscritosIds.has(idCurso);
  }

  displayNivel(curso: any): string {
    return curso.nivel_recomendado === 'C2' ? 'C+' : curso.nivel_recomendado;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
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