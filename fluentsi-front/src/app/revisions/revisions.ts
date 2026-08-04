import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-revisions',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
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
  
  revisionSeleccionada: any = null;
  respuestasParsed: any[] = [];
  feedbackTexto: string = '';
  enviandoFeedback: boolean = false;

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

    return this.intentos.filter((item) => {
      const coincideTexto = !texto ||
        (item.nombre_alumno && item.nombre_alumno.toLowerCase().includes(texto)) ||
        (item.titulo_curso && item.titulo_curso.toLowerCase().includes(texto)) ||
        (item.titulo_examen && item.titulo_examen.toLowerCase().includes(texto));

      const coincideAlumno = !alumnoFilter || item.nombre_alumno === alumnoFilter;

      return coincideTexto && coincideAlumno;
    });
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
        alert('¡Retroalimentación enviada con éxito!');
        this.revisionSeleccionada.feedback_texto = this.feedbackTexto;
        this.revisionSeleccionada = null;
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