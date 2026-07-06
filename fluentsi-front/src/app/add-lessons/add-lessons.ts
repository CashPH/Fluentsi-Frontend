import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-add-lessons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule],
  templateUrl: './add-lessons.html',
  styleUrls: ['./add-lessons.css']
})
export class AddLessonsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  idCurso: string | null = null;
  lecciones: any[] = [];
  leccionEnEdicionId: number | null = null;

  lessonForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    tipo_contenido: ['Lectura', Validators.required],
    contenido: [''], 
    orden: [1, Validators.required],
    preguntas: this.fb.array([]) 
  });

  ngOnInit(): void {
    this.idCurso = this.route.snapshot.paramMap.get('id');
    if (this.idCurso) {
      this.cargarLecciones();
    }
  }

  cargarLecciones() {
    this.http.get(`http://localhost:4000/api/cursos/${this.idCurso}/lecciones`).subscribe({
      next: (data: any) => {
        this.lecciones = data;
        this.prepararNuevaLeccion();
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Error al cargar lecciones:', err)
    });
  }

  prepararNuevaLeccion() {
    this.leccionEnEdicionId = null;
    let nextOrder = 1;
    if (this.lecciones.length > 0) {
      nextOrder = this.lecciones[this.lecciones.length - 1].orden + 1;
    }
    this.lessonForm.reset({ tipo_contenido: 'Lectura', orden: nextOrder, contenido: '' });
    this.preguntas.clear();
  }

  editarLeccion(leccion: any) {
    this.leccionEnEdicionId = leccion.id_leccion;
    this.lessonForm.patchValue({
      titulo: leccion.titulo,
      tipo_contenido: leccion.tipo_contenido,
      contenido: leccion.contenido_html,
      orden: leccion.orden
    });
    
    this.preguntas.clear();

    if (leccion.tipo_contenido === 'Quiz') {
      const id_examen = leccion.contenido_html; 
      
      this.http.get(`http://localhost:4000/api/examenes/${id_examen}/completo`).subscribe({
        next: (preguntasData: any) => {
          
          preguntasData.forEach((pregunta: any) => {
            const opcionesFormArray = this.fb.array(
              pregunta.opciones.map((opcion: any) => this.fb.group({
                opcion_texto: [opcion.opcion_texto, Validators.required],
                es_correcta: [opcion.es_correcta === 1] // En MySQL se guarda como 1 (true) o 0 (false)
              }))
            );

            this.preguntas.push(this.fb.group({
              pregunta_texto: [pregunta.pregunta_texto, Validators.required],
              opciones: opcionesFormArray
            }));
          });
          
          this.cdr.detectChanges(); 
        },
        error: (err) => console.error('Error al cargar preguntas:', err)
      });
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarLeccionDelTemario(id_leccion: number) {
    if (confirm('¿Estás seguro de que quieres eliminar esta lección del temario? Esta acción no se puede deshacer.')) {
      
      this.http.delete(`http://localhost:4000/api/lecciones/${id_leccion}`).subscribe({
        next: () => {
          alert('¡Lección eliminada correctamente!');
          this.cargarLecciones();
          
          if (this.leccionEnEdicionId === id_leccion) {
            this.prepararNuevaLeccion();
          }
        },
        error: (err) => {
          console.error('Error al eliminar:', err);
          alert('Hubo un problema al intentar eliminar la lección.');
        }
      });
    }
  }

  get preguntas() {
    return this.lessonForm.get('preguntas') as FormArray;
  }

  getOpciones(preguntaIndex: number) {
    return this.preguntas.at(preguntaIndex).get('opciones') as FormArray;
  }

  agregarPregunta() {
    const preguntaForm = this.fb.group({
      pregunta_texto: ['', Validators.required],
      opciones: this.fb.array([
        this.fb.group({ opcion_texto: ['', Validators.required], es_correcta: [true] }),
        this.fb.group({ opcion_texto: ['', Validators.required], es_correcta: [false] })
      ])
    });
    this.preguntas.push(preguntaForm);
  }

  eliminarPregunta(index: number) {
    this.preguntas.removeAt(index);
  }

  agregarOpcion(preguntaIndex: number) {
    this.getOpciones(preguntaIndex).push(this.fb.group({ opcion_texto: ['', Validators.required], es_correcta: [false] }));
  }

  eliminarOpcion(preguntaIndex: number, opcionIndex: number) {
    this.getOpciones(preguntaIndex).removeAt(opcionIndex);
  }

  marcarComoCorrecta(preguntaIndex: number, opcionIndex: number) {
    const opciones = this.getOpciones(preguntaIndex).controls;
    opciones.forEach((opcion, i) => {
      opcion.get('es_correcta')?.setValue(i === opcionIndex);
    });
  }

  onSubmit() {
    if (this.lessonForm.invalid) return;

    const payload = {
      id_curso: this.idCurso,
      titulo: this.lessonForm.value.titulo,
      tipo_contenido: this.lessonForm.value.tipo_contenido,
      contenido: this.lessonForm.value.contenido,
      orden: this.lessonForm.value.orden,
      preguntas: this.lessonForm.value.preguntas // Mandamos todas las preguntas actualizadas
    };

    if (this.leccionEnEdicionId) {
      this.http.put(`http://localhost:4000/api/lecciones/${this.leccionEnEdicionId}`, payload).subscribe({
        next: () => {
          alert('¡Lección actualizada chido!');
          this.cargarLecciones();
        },
        error: (err) => console.error(err)
      });
    } else {
      this.http.post('http://localhost:4000/api/lecciones', payload).subscribe({
        next: () => {
          alert('¡Lección agregada al temario!');
          this.cargarLecciones();
        },
        error: (err) => console.error(err)
      });
    }
  }
}