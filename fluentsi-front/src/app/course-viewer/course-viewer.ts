import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-viewer.html',
  styleUrls: ['./course-viewer.css']
})
export class CourseViewerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  idCurso: number | null = null;
  userId: number | null = null;
  idInscripcion: number | null = null;

  curso: any = null;
  lecciones: any[] = [];
  leccionSeleccionada: any = null;
  completadasSet: Set<number> = new Set<number>();
  porcentajeAvance: number = 0;
  cargando: boolean = true;

  // Quiz state
  preguntasQuiz: any[] = [];
  respuestasAlumno: { [key: number]: number } = {}; // id_pregunta -> id_opcion
  quizEnviado: boolean = false;
  puntajeQuiz: number = 0;
  guardandoProgreso: boolean = false;
  cursoCompletado: boolean = false;

  // Attempt & Lock states
  intentosRealizados: number = 0;
  maxIntentosPermitidos: number = 3;
  tieneReapertura: boolean = false;
  quizBloqueadoPorIntentos: boolean = false;
  mensajeBloqueoQuiz: string = '';
  feedbackProfesor: string = '';

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userId = Number(user.userId ?? user.id_estudiante ?? null) || null;
    }

    const paramId = this.route.snapshot.paramMap.get('id');
    if (paramId) {
      this.idCurso = Number(paramId);
      this.cargarTodo();
    } else {
      this.http.get<any[]>('http://localhost:4000/api/cursos').subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.idCurso = data[0].id_curso;
            this.cargarTodo();
          }
        }
      });
    }
  }

  cargarTodo(): void {
    if (!this.idCurso) return;
    this.cargando = true;

    this.http.get<any>(`http://localhost:4000/api/cursos/${this.idCurso}`).subscribe({
      next: (data) => this.curso = data,
      error: (err) => console.error('Error al cargar curso:', err)
    });

    if (this.userId) {
      this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).subscribe({
        next: (inscripciones) => {
          const ins = inscripciones.find((i: any) => i.id_curso === this.idCurso);
          if (ins) {
            this.idInscripcion = ins.id_inscripcion_curso;
            this.cargarProgreso();
          }
        }
      });
    }

    this.http.get<any[]>(`http://localhost:4000/api/cursos/${this.idCurso}/lecciones`).subscribe({
      next: (data) => {
        this.lecciones = data || [];
        if (this.lecciones.length > 0) {
          this.seleccionarLeccion(this.lecciones[0]);
        } else {
          this.cargando = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar lecciones:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarProgreso(): void {
    if (!this.idInscripcion) return;

    this.http.get<any>(`http://localhost:4000/api/progreso/${this.idInscripcion}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.completadasSet = new Set(res.completadas || []);
          this.porcentajeAvance = res.porcentaje || 0;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error al cargar progreso:', err)
    });
  }

  seleccionarLeccion(leccion: any): void {
    this.leccionSeleccionada = leccion;
    this.quizEnviado = false;
    this.respuestasAlumno = {};
    this.puntajeQuiz = 0;
    this.quizBloqueadoPorIntentos = false;
    this.mensajeBloqueoQuiz = '';
    this.feedbackProfesor = '';

    if (leccion.tipo_contenido === 'Quiz' && leccion.contenido_html) {
      this.cargarExamen(leccion.contenido_html);
      this.verificarEstadoIntentos(leccion);
    }
    this.cdr.detectChanges();
  }

  verificarEstadoIntentos(leccion: any): void {
    if (!this.userId || !leccion.id_leccion) return;

    const esExamenFinal = (leccion.titulo || '').toLowerCase().includes('examen');
    this.maxIntentosPermitidos = esExamenFinal ? 1 : 3;

    this.http.get<any>(`http://localhost:4000/api/quiz/intentos/estado?id_estudiante=${this.userId}&id_leccion=${leccion.id_leccion}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.intentosRealizados = res.totalIntentos || 0;
          this.tieneReapertura = !!res.tieneReapertura;
          this.feedbackProfesor = res.feedbackTexto || '';

          if (esExamenFinal) {
            if (this.intentosRealizados >= 1 && !this.tieneReapertura) {
              this.quizBloqueadoPorIntentos = true;
              this.mensajeBloqueoQuiz = 'Has completado tu único intento permitido para este examen. Si necesitas una oportunidad adicional, solicítasela a tu profesor.';
            } else if (this.tieneReapertura) {
              this.quizBloqueadoPorIntentos = false;
              this.mensajeBloqueoQuiz = '¡Tu profesor ha reabierto este examen! Tienes 1 intento disponible.';
            }
          } else {
            if (this.intentosRealizados >= 3) {
              this.quizBloqueadoPorIntentos = true;
              this.mensajeBloqueoQuiz = 'Has alcanzado el límite de 3 intentos para este quiz. Tu profesor revisará tus resultados.';
            }
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error al verificar intentos:', err)
    });
  }

  cargarExamen(idExamen: any): void {
    this.http.get<any[]>(`http://localhost:4000/api/examenes/${idExamen}/completo`).subscribe({
      next: (preguntas) => {
        this.preguntasQuiz = preguntas || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error al cargar quiz:', err)
    });
  }

  seleccionarOpcion(idPregunta: number, idOpcion: number): void {
    if (this.quizEnviado || this.quizBloqueadoPorIntentos || this.leccionSeleccionada?.bloqueada === 1) return;
    this.respuestasAlumno[idPregunta] = idOpcion;
  }

  estaCompletada(idLeccion: number): boolean {
    return this.completadasSet.has(Number(idLeccion));
  }

  marcarLeccionCompletada(): void {
    if (!this.idInscripcion || !this.leccionSeleccionada) return;
    if (this.leccionSeleccionada.bloqueada === 1 && !this.estaCompletada(this.leccionSeleccionada.id_leccion)) return;
    if (this.estaCompletada(this.leccionSeleccionada.id_leccion)) {
      // Ya está completada, avanzar si hay siguiente
      if (this.siguienteLeccionObj) {
        this.seleccionarLeccion(this.siguienteLeccionObj);
      } else {
        this.cursoCompletado = true;
        this.cdr.detectChanges();
      }
      return;
    }

    this.guardandoProgreso = true;
    this.http.post<any>('http://localhost:4000/api/progreso', {
      id_inscripcion_curso: this.idInscripcion,
      id_leccion: this.leccionSeleccionada.id_leccion
    }).subscribe({
      next: (res) => {
        this.guardandoProgreso = false;
        if (res.success) {
          this.completadasSet.add(Number(this.leccionSeleccionada.id_leccion));
          this.porcentajeAvance = res.porcentaje;
          this.cdr.detectChanges();
          if (this.siguienteLeccionObj) {
            this.siguienteLeccion();
          } else {
            this.cursoCompletado = true;
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => {
        this.guardandoProgreso = false;
        console.error('Error al marcar leccion:', err);
      }
    });
  }

  enviarQuiz(): void {
    if (!this.leccionSeleccionada || this.preguntasQuiz.length === 0 || this.quizBloqueadoPorIntentos || this.leccionSeleccionada.bloqueada === 1) return;

    let correctas = 0;
    const respuestasFormateadas: any[] = [];

    this.preguntasQuiz.forEach((preg) => {
      const opcionId = this.respuestasAlumno[preg.id_pregunta];
      const opcionObj = preg.opciones?.find((o: any) => o.id_opcion === opcionId);
      const esCorrecta = opcionObj ? opcionObj.es_correcta === 1 : false;

      if (esCorrecta) {
        correctas++;
      }

      const opcionCorrecta = preg.opciones?.find((o: any) => o.es_correcta === 1);

      respuestasFormateadas.push({
        id_pregunta: preg.id_pregunta,
        pregunta_texto: preg.pregunta_texto,
        id_opcion_seleccionada: opcionId || null,
        opcion_texto_seleccionada: opcionObj ? opcionObj.opcion_texto : 'Sin respuesta',
        opcion_correcta_texto: opcionCorrecta ? opcionCorrecta.opcion_texto : '',
        es_correcta: esCorrecta
      });
    });

    this.puntajeQuiz = Math.round((correctas / this.preguntasQuiz.length) * 100);
    this.quizEnviado = true;
    this.cdr.detectChanges();

    if (this.userId && this.idInscripcion) {
      this.http.post('http://localhost:4000/api/quiz/intentos', {
        id_estudiante: this.userId,
        id_examen: Number(this.leccionSeleccionada.contenido_html),
        id_leccion: this.leccionSeleccionada.id_leccion,
        id_inscripcion_curso: this.idInscripcion,
        respuestas_json: respuestasFormateadas,
        puntaje: this.puntajeQuiz
      }).subscribe({
        next: () => {
          this.verificarEstadoIntentos(this.leccionSeleccionada);
          this.guardarProgresoQuiz();
        },
        error: (err) => {
          console.error('Error al guardar intento de quiz:', err);
          this.guardarProgresoQuiz();
        }
      });
    } else {
      if (!this.siguienteLeccionObj) {
        this.cursoCompletado = true;
        this.cdr.detectChanges();
      }
    }
  }

  /**
   * Guarda el progreso de una lección de tipo Quiz sin auto-avanzar.
   * Muestra la pantalla de curso completado si es la última lección.
   */
  private guardarProgresoQuiz(): void {
    if (!this.idInscripcion || !this.leccionSeleccionada) {
      // Sin inscripción, al menos marcar visualmente si es la última
      if (!this.siguienteLeccionObj) {
        this.cursoCompletado = true;
        this.cdr.detectChanges();
      }
      return;
    }

    // Si ya estaba completada, simplemente verificar si es la última
    if (this.estaCompletada(this.leccionSeleccionada.id_leccion)) {
      if (!this.siguienteLeccionObj) {
        this.cursoCompletado = true;
        this.cdr.detectChanges();
      }
      return;
    }

    this.http.post<any>('http://localhost:4000/api/progreso', {
      id_inscripcion_curso: this.idInscripcion,
      id_leccion: this.leccionSeleccionada.id_leccion
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.completadasSet.add(Number(this.leccionSeleccionada.id_leccion));
          this.porcentajeAvance = res.porcentaje;
        }
        // Siempre verificar si es la última lección para mostrar pantalla de completado
        if (!this.siguienteLeccionObj) {
          this.cursoCompletado = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al guardar progreso del quiz:', err);
        // Incluso si falla, mostrar pantalla de fin si es la última
        if (!this.siguienteLeccionObj) {
          this.cursoCompletado = true;
          this.cdr.detectChanges();
        }
      }
    });
  }

  siguienteLeccion(): void {
    if (!this.leccionSeleccionada) return;
    const idx = this.lecciones.findIndex(l => Number(l.id_leccion) === Number(this.leccionSeleccionada.id_leccion));
    if (idx !== -1 && idx < this.lecciones.length - 1) {
      this.seleccionarLeccion(this.lecciones[idx + 1]);
    }
  }

  anteriorLeccion(): void {
    if (!this.leccionSeleccionada) return;
    const idx = this.lecciones.findIndex(l => Number(l.id_leccion) === Number(this.leccionSeleccionada.id_leccion));
    if (idx > 0) {
      this.seleccionarLeccion(this.lecciones[idx - 1]);
    }
  }

  get esUltimaLeccion(): boolean {
    if (!this.leccionSeleccionada || this.lecciones.length === 0) return false;
    const idx = this.lecciones.findIndex(l => Number(l.id_leccion) === Number(this.leccionSeleccionada.id_leccion));
    return idx === this.lecciones.length - 1;
  }

  get esPrimeraLeccion(): boolean {
    if (!this.leccionSeleccionada || this.lecciones.length === 0) return false;
    const idx = this.lecciones.findIndex(l => Number(l.id_leccion) === Number(this.leccionSeleccionada.id_leccion));
    return idx === 0;
  }

  get siguienteLeccionObj(): any {
    if (!this.leccionSeleccionada || this.lecciones.length === 0) return null;
    const idx = this.lecciones.findIndex(l => Number(l.id_leccion) === Number(this.leccionSeleccionada.id_leccion));
    if (idx !== -1 && idx < this.lecciones.length - 1) {
      return this.lecciones[idx + 1];
    }
    return null;
  }

  volverAIndex(): void {
    this.router.navigate(['/cursos-student']);
  }
}