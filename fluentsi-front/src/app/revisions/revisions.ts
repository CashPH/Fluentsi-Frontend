import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-revisions',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, DatePipe],
  templateUrl: './revisions.html',
  styleUrls: ['./revisions.css']
})
export class RevisionsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  teacherId: number | null = null;
  intentos: any[] = [];
  cargando: boolean = true;

  filtroTexto: string = '';
  filtroAlumno: string = '';
  filtroTipo: string = ''; // '' = Todos, 'Examen' = Solo Exámenes, 'Quiz' = Solo Quizzes

  revisionSeleccionada: any = null;
  respuestasParsed: any[] = [];
  feedbackTexto: string = '';
  enviandoFeedback: boolean = false;
  reabriendoExamen: boolean = false;

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.teacherId = Number(user.userId ?? user.id_instructor ?? null) || null;
    }
    this.cargarIntentos();
  }

  cargarIntentos(): void {
    this.cargando = true;
    const idParam = this.teacherId || 0;

    this.http.get<any>(`http://localhost:4000/api/teacher/${idParam}/intentos-quiz`).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.intentos = res.data;
        } else {
          this.intentos = [];
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar revisiones:', err);
        this.intentos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  reabrirExamen(): void {
    if (!this.revisionSeleccionada) return;
    this.reabriendoExamen = true;

    this.http.post('http://localhost:4000/api/examenes/reabrir', {
      id_estudiante: this.revisionSeleccionada.id_estudiante,
      id_leccion: this.revisionSeleccionada.id_leccion
    }).subscribe({
      next: () => {
        this.reabriendoExamen = false;
        alert(`¡Examen reabierto con éxito para ${this.revisionSeleccionada.nombre_alumno}! Podrá realizar 1 intento adicional.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reabriendoExamen = false;
        console.error('Error al reabrir examen:', err);
        alert('Hubo un error al reabrir el examen.');
      }
    });
  }

  esExamen(item: any): boolean {
    if (!item) return false;
    const titulo = (item.titulo_examen || item.titulo_leccion || '').toLowerCase();
    return titulo.includes('examen');
  }

  get alumnosUnicos(): string[] {
    const nombres = new Set<string>();
    this.intentos.forEach(item => {
      if (item.nombre_alumno) nombres.add(item.nombre_alumno);
    });
    return Array.from(nombres);
  }

  get intentosFiltrados(): any[] {
    const texto = this.filtroTexto.trim().toLowerCase();
    const alumnoFilter = this.filtroAlumno;
    const tipoFilter = this.filtroTipo;

    return this.intentos.filter((item) => {
      const coincideTexto = !texto ||
        (item.nombre_alumno && item.nombre_alumno.toLowerCase().includes(texto)) ||
        (item.titulo_curso && item.titulo_curso.toLowerCase().includes(texto)) ||
        (item.titulo_leccion && item.titulo_leccion.toLowerCase().includes(texto));

      const coincideAlumno = !alumnoFilter || item.nombre_alumno === alumnoFilter;
      const esEx = this.esExamen(item);
      const coincideTipo = !tipoFilter || (tipoFilter === 'Examen' ? esEx : !esEx);

      return coincideTexto && coincideAlumno && coincideTipo;
    });
  }

  get totalCorrectas(): number {
    return this.respuestasParsed.filter(r => r.es_correcta).length;
  }

  seleccionarRevision(item: any) {
    if (this.revisionSeleccionada && this.revisionSeleccionada.id_intento === item.id_intento) {
      this.revisionSeleccionada = null;
      this.respuestasParsed = [];
      this.feedbackTexto = '';
    } else {
      this.revisionSeleccionada = item;
      this.feedbackTexto = item.feedback_texto || '';

      try {
        if (typeof item.respuestas_json === 'string') {
          this.respuestasParsed = JSON.parse(item.respuestas_json);
        } else if (Array.isArray(item.respuestas_json)) {
          this.respuestasParsed = item.respuestas_json;
        } else {
          this.respuestasParsed = [];
        }
      } catch (e) {
        this.respuestasParsed = [];
      }
    }
    this.cdr.detectChanges();
  }

  enviarRetroalimentacion() {
    if (!this.revisionSeleccionada) return;

    this.enviandoFeedback = true;
    this.http.put(`http://localhost:4000/api/quiz/intentos/${this.revisionSeleccionada.id_intento}/feedback`, {
      feedback_texto: this.feedbackTexto
    }).subscribe({
      next: (res: any) => {
        this.enviandoFeedback = false;
        alert('¡Retroalimentación enviada al alumno con éxito!');
        if (this.revisionSeleccionada) {
          this.revisionSeleccionada.feedback_texto = this.feedbackTexto;
        }
        this.cargarIntentos();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.enviandoFeedback = false;
        console.error('Error al enviar retroalimentación:', err);
        alert('Hubo un error al enviar la retroalimentación.');
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}