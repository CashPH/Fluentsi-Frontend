import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Subscription, catchError, forkJoin, of } from 'rxjs';

interface CalificacionDesempenio {
  id_calificacion?: number;
  id_instructor?: number;
  evaluacion_cursos?: string;
  evaluacion_examenes?: string;
  evaluacion_general?: string;
  comentarios?: string;
  nombre_instructor?: string;
  fecha_calificacion?: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  nombreCompleto: string = 'Estudiante';
  userId: number | null = null;
  private userSubscription: Subscription | null = null;

  totalCursos: number = 0;
  promedioProgreso: number = 0;

  cursosActivos: any[] = [];
  cursosDisponibles: any[] = [];
  calificacionesDesempenio: CalificacionDesempenio[] = [];

  cargando: boolean = true;
  inscribiendoCursoId: number | null = null;
  mensajeExito: string = '';

  chatOpen: boolean = false;
  chatMessages: Array<{ sender: 'student' | 'bot'; text: string }> = [
    { sender: 'bot', text: 'Hola 👋, soy Handy, tu asistente de idiomas. Puedes preguntarme sobre gramática, vocabulario, tiempos verbales o traducciones.' }
  ];
  chatInput: string = '';
  loadingChat: boolean = false;
  errorChat: string = '';

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.setUserData(user);
    }

    this.userSubscription = this.authService.user$.subscribe(u => {
      if (u) {
        this.setUserData(u);
        this.cargarDatos();
      }
    });

    this.cargarDatos();
  }

  private setUserData(user: any): void {
    if (!user) return;
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
    this.cdr.detectChanges();

    if (!this.userId) {
      const user = this.authService.getUser();
      if (user) {
        this.setUserData(user);
      }
    }

    const cursos$ = this.http.get<any[]>('http://localhost:4000/api/cursos').pipe(
      catchError(err => {
        console.error('Error al cargar cursos:', err);
        return of([]);
      })
    );

    const inscripciones$ = (this.userId && this.userId > 0)
      ? this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).pipe(
          catchError(err => {
            console.error('Error al cargar inscripciones:', err);
            return of([]);
          })
        )
      : of([]);

    const calificaciones$ = (this.userId && this.userId > 0)
      ? this.http.get<any>(`http://localhost:4000/api/calificaciones-desempenio/estudiante/${this.userId}`).pipe(
          catchError(err => {
            console.error('Error al cargar calificaciones:', err);
            return of({ success: true, data: [] });
          })
        )
      : of({ success: true, data: [] });

    forkJoin({ todos: cursos$, inscritos: inscripciones$, calificaciones: calificaciones$ }).subscribe(({ todos, inscritos, calificaciones }) => {
      const todosLista = Array.isArray(todos) ? todos : [];
      const inscritosLista = Array.isArray(inscritos) ? inscritos : [];
      const calificacionesLista = calificaciones.data || [];

      this.cursosActivos = inscritosLista;
      this.totalCursos = todosLista.length;
      this.calificacionesDesempenio = calificacionesLista;

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
    });
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

  getColorClass(evaluacion: string | undefined): string {
    switch(evaluacion) {
      case 'rojo': return 'eval-rojo';
      case 'amarillo': return 'eval-amarillo';
      case 'verde': return 'eval-verde';
      default: return '';
    }
  }

  getEmoji(evaluacion: string | undefined): string {
    switch(evaluacion) {
      case 'rojo': return '❌';
      case 'amarillo': return '⚠️';
      case 'verde': return '✅';
      default: return '❓';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      setTimeout(() => {
        const messagesContainer = document.querySelector('.chatbot-messages');
        messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
      }, 10);
    }
  }

  sendChat(): void {
    const question = this.chatInput.trim();
    if (!question) return;

    this.chatMessages.push({ sender: 'student', text: question });
    this.chatInput = '';
    this.loadingChat = true;
    this.errorChat = '';
    this.cdr.detectChanges();

    this.http.post<{ answer: string }>('http://localhost:4000/api/chat', { question }).subscribe({
      next: (response) => {
        this.chatMessages.push({ sender: 'bot', text: response.answer });
        this.loadingChat = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          const messagesContainer = document.querySelector('.chatbot-messages');
          messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
        }, 10);
      },
      error: (err) => {
        console.error('Error en chatbot:', err);
        this.errorChat = 'No pude obtener respuesta en este momento. Intenta de nuevo en unos segundos.';
        this.chatMessages.push({ sender: 'bot', text: 'Lo siento, no puedo responder ahora. Por favor intenta de nuevo.' });
        this.loadingChat = false;
        this.cdr.detectChanges();
      }
    });
  }

  goToCursosStudent(): void {
    this.router.navigate(['/cursos-student']);
  }

  goToCursoViewer(idCurso: number): void {
    this.router.navigate(['/curso', idCurso]);
  }
}