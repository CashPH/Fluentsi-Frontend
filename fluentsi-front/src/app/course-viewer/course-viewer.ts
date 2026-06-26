import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-course-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-viewer.html',
  styleUrls: ['./course-viewer.css']
})
export class CourseViewerComponent {
  lecciones = [
    { titulo: 'Tag Questions', tipo: 'leccion', activa: true },
    { titulo: 'Quiz: Tag Questions', tipo: 'quiz', activa: false }
  ];
}