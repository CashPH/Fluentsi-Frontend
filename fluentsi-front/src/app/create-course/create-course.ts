import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-create-course',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './create-course.html',
  styleUrls: ['./create-course.css']
})
export class CreateCourseComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  courseForm: FormGroup = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: ['', Validators.required],
    id_idioma: [1, Validators.required],
    nivel_recomendado: ['A1', Validators.required],
    es_gratuito: [true],
    precio: [0]
  });

  onSubmit() {
    if (this.courseForm.valid) {
      this.http.post('http://localhost:4000/api/cursos', this.courseForm.value)
        .subscribe({
          next: (res) => {
            alert('¡Curso creado exitosamente en la base de datos!');
            this.courseForm.reset({ id_idioma: 1, nivel_recomendado: 'A1', es_gratuito: true, precio: 0 });
          },
          error: (err) => {
            alert('Error al guardar el curso. Revisa la consola.');
            console.error(err);
          }
        });
    }
  }
}