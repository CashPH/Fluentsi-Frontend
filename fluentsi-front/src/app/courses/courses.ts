import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. Importamos ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class CoursesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); 

  niveles = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  etiquetas = ['Test', 'Inglés', 'Francés'];
  
  cursos: any[] = []; 

  ngOnInit(): void {
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.http.get('http://localhost:4000/api/cursos').subscribe({
      next: (data: any) => {
        this.cursos = data;
        
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar los cursos:', err);
      }
    });
  }

  gestionarCurso(idCurso: number): void {
    this.router.navigate(['/editar-curso', idCurso]);
  }
}