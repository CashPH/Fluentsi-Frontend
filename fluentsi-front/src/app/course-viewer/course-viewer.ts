import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
      // Fallback si viene a /leccion sin id
      this.http.get<any[]>('http://localhost:4000/api/cursos').subscribe({
        next: (cursos) => {
          if (cursos && cursos.length > 0) {
            this.idCurso = cursos[0].id_curso;
            this.cargarTodo();
          } else {
            this.cargando = false;
          }
        },
        error: () => { this.cargando = false; }
      });
    }
  }

  cargarTodo(): void {
    if (!this.idCurso) return;
    this.cargando = true;

    // 1. Obtener detalles del curso
    this.http.get(`http://localhost:4000/api/cursos/${this.idCurso}`).subscribe({
      next: (cursoData: any) => {
        this.curso = cursoData;

        // 2. Obtener lecciones
        this.http.get<any[]>(`http://localhost:4000/api/cursos/${this.idCurso}/lecciones`).subscribe({
          next: (leccionesData) => {
            this.lecciones = leccionesData || [];

            // 3. Obtener inscripción del alumno
            if (this.userId) {
              this.http.get<any[]>(`http://localhost:4000/api/inscripciones/${this.userId}`).subscribe({
                next: (inscripciones) => {
                  const insc = inscripciones.find(i => Number(i.id_curso) === Number(this.idCurso));
                  if (insc) {
                    this.idInscripcion = insc.id_inscripcion_curso;
                    this.porcentajeAvance = Number(insc.porcentaje_avance) || 0;
                    this.cargarProgreso();
                  } else {
                    this.cargando = false;
                    this.seleccionarPrimeraLeccion();
                  }
                },
                error: () => {
                  this.cargando = false;
                  this.seleccionarPrimeraLeccion();
                }
              });
            } else {
              this.cargando = false;
              this.seleccionarPrimeraLeccion();
            }
          },
          error: (err) => {
            console.error('Error al cargar lecciones:', err);
            this.cargando = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar curso:', err);
        this.cargando = false;
      }
    });
  }

  cargarProgreso(): void {
    if (!this.idInscripcion) {
      this.cargando = false;
      this.seleccionarPrimeraLeccion();
      return;
    }

    this.http.get<any>(`http://localhost:4000/api/progreso/${this.idInscripcion}`).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.completadasSet = new Set(res.data.map((item: any) => Number(item.id_leccion)));
        }
        this.cargando = false;
        this.seleccionarPrimeraLeccion();
      },
      error: (err) => {
        console.error('Error al cargar progreso:', err);
        this.cargando = false;
        this.seleccionarPrimeraLeccion();
      }
    });
  }

  seleccionarPrimeraLeccion(): void {
    if (this.lecciones.length > 0) {
      // Buscar primera no completada o la primera
      const noCompletada = this.lecciones.find(l => !this.completadasSet.has(Number(l.id_leccion)));
      this.seleccionarLeccion(noCompletada || this.lecciones[0]);
    }
    this.cdr.detectChanges();
  }

  seleccionarLeccion(leccion: any): void {
    this.leccionSeleccionada = leccion;
    this.quizEnviado = false;
    this.respuestasAlumno = {};
    this.preguntasQuiz = [];
    this.puntajeQuiz = 0;

    if (leccion.tipo_contenido === 'Quiz' && leccion.contenido_html) {
      this.cargarExamen(leccion.contenido_html);
    }
    this.cdr.detectChanges();
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
    if (this.quizEnviado) return;
    this.respuestasAlumno[idPregunta] = idOpcion;
  }

  estaCompletada(idLeccion: number): boolean {
    return this.completadasSet.has(Number(idLeccion));
  }

  marcarLeccionCompletada(): void {
    if (!this.idInscripcion || !this.leccionSeleccionada) return;
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
          // Si hay siguiente lección, avanzar; si no, mostrar pantalla de curso completado
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
    if (!this.leccionSeleccionada || this.preguntasQuiz.length === 0) return;

    let correctas = 0;
    const respuestasFormateadas: any[] = [];

    this.preguntasQuiz.forEach((preg) => {
      const opcionId = this.respuestasAlumno[preg.id_pregunta];
      const opcionObj = preg.opciones?.find((o: any) => o.id_opcion === opcionId);
      const esCorrecta = opcionObj ? opcionObj.es_correcta === 1 : false;

      if (esCorrecta) {
        correctas++;
      }

      respuestasFormateadas.push({
        id_pregunta: preg.id_pregunta,
        pregunta_texto: preg.pregunta_texto,
        id_opcion_seleccionada: opcionId || null,
        opcion_texto_seleccionada: opcionObj ? opcionObj.opcion_texto : 'Sin respuesta',
        es_correcta: esCorrecta
      });
    });

    this.puntajeQuiz = Math.round((correctas / this.preguntasQuiz.length) * 100);
    this.quizEnviado = true;
    this.cdr.detectChanges();

    // Guardar el intento de quiz y luego marcar progreso siempre
    if (this.userId && this.idInscripcion) {
      this.http.post('http://localhost:4000/api/quiz/intentos', {
        id_estudiante: this.userId,
        id_examen: Number(this.leccionSeleccionada.contenido_html),
        id_leccion: this.leccionSeleccionada.id_leccion,
        id_inscripcion_curso: this.idInscripcion,
        respuestas_json: respuestasFormateadas,
        puntaje: this.puntajeQuiz
      }).subscribe({
        next: () => this.guardarProgresoQuiz(),
        // Si falla el guardado del intento, igual marcamos el progreso de la lección
        error: (err) => {
          console.error('Error al guardar intento de quiz:', err);
          this.guardarProgresoQuiz();
        }
      });
    } else {
      // Sin autenticación, al menos mostrar la pantalla de fin si es la última
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