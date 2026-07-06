import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router'; 

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './create-course.html',
  styleUrls: ['./create-course.css']
})
export class CreateCourseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute); 

  courseForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    id_idioma: [1, Validators.required],
    nivel_recomendado: ['A1', Validators.required],
    es_gratuito: [true],
    precio: [0]
  });

  isEditMode = false; 
  currentCourseId: string | null = null;

  ngOnInit(): void {
    this.currentCourseId = this.route.snapshot.paramMap.get('id');

    if (this.currentCourseId) {
      this.isEditMode = true;
      this.cargarDatosDelCurso(this.currentCourseId);
    }
  }

  cargarDatosDelCurso(id: string) {
    this.http.get(`http://localhost:4000/api/cursos/${id}`).subscribe({
      next: (curso: any) => {
        this.courseForm.patchValue({
          titulo: curso.titulo,
          descripcion: curso.descripcion,
          id_idioma: curso.id_idioma,
          nivel_recomendado: curso.nivel_recomendado,
          es_gratuito: curso.es_gratuito ? true : false,
          precio: curso.precio
        });
      },
      error: (err) => {
        console.error('Error al cargar el curso para editar', err);
        alert('No se pudo cargar la información del curso.');
      }
    });
  }

  onSubmit() {
    if (this.courseForm.invalid) return;

    if (this.isEditMode) {
      this.http.put(`http://localhost:4000/api/cursos/${this.currentCourseId}`, this.courseForm.value)
        .subscribe({
          next: (res: any) => {
            alert('¡Curso actualizado exitosamente, mi perro!');
            this.router.navigate(['/agregar-lecciones', this.currentCourseId]);
          },
          error: (err) => {
            alert('Error al actualizar el curso.');
            console.error(err);
          }
        });
    } else {
      this.http.post('http://localhost:4000/api/cursos', this.courseForm.value)
        .subscribe({
          next: (res: any) => { 
            alert('¡Curso creado exitosamente! Vamos a agregar sus lecciones.');
            this.router.navigate(['/agregar-lecciones', res.id_curso]);
          },
          error: (err) => {
            alert('Error al guardar el curso.');
            console.error(err);
          }
        });
    }
  }
}