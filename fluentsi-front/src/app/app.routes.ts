import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { CoursesComponent } from './courses/courses';
import { RevisionsComponent } from './revisions/revisions';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard';
import { MyAgendaComponent } from './agenda/agenda';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard';
import { AuthGuard } from './services/auth.guard';
import { NoAuthGuard } from './services/no-auth.guard';
import { CourseViewerComponent } from './course-viewer/course-viewer';
import { QuizComponent } from './quiz/quiz';
import { CreateCourseComponent } from './create-course/create-course';
import { AddLessonsComponent } from './add-lessons/add-lessons';
import { CursosStudentComponent } from './cursos-student/cursos-student';
import { CalificacionesInstructor } from './calificaciones.instructor/calificaciones.instructor';


import { AdminGuard } from './services/admin.guard';
import { LoginAdmin } from './admin/login-admin/login-admin'; 

export const routes: Routes = [
  { path: '', component: Login, canActivate: [NoAuthGuard] },
  { path: 'login', component: Login, canActivate: [NoAuthGuard] },
  { path: 'register', component: Register, canActivate: [NoAuthGuard] },
  { path: 'cursos', component: CoursesComponent, canActivate: [AuthGuard] },
  { path: 'revisiones', component: RevisionsComponent, canActivate: [AuthGuard] },
  { path: 'teacher-home', component: TeacherDashboardComponent, canActivate: [AuthGuard] },
  { path: 'agenda', component: MyAgendaComponent, canActivate: [AuthGuard] },
  { path: 'student-dashboard', component: StudentDashboardComponent, canActivate: [AuthGuard] },
  { path: 'student-home', component: StudentDashboardComponent, canActivate: [AuthGuard] },
  { path: 'curso/:id', component: CourseViewerComponent, canActivate: [AuthGuard] },
  { path: 'leccion', component: CourseViewerComponent, canActivate: [AuthGuard] },
  { path: 'quiz', component: QuizComponent, canActivate: [AuthGuard] },
  { path: 'cursos-student', component: CursosStudentComponent },
  { path: 'calificaciones-instructor', component: CalificacionesInstructor, canActivate: [AuthGuard] },

  // ==========================================
  // RUTAS DEL INSTRUCTOR (GESTIÓN DE CURSOS)
  // ==========================================
  { path: 'crear-curso', component: CreateCourseComponent, canActivate: [AuthGuard] },
  
  { path: 'editar-curso/:id', component: CreateCourseComponent, canActivate: [AuthGuard] },
  
  // Ruta para agregar lecciones a un curso específico
  { path: 'agregar-lecciones/:id', component: AddLessonsComponent, canActivate: [AuthGuard] },

// ==========================================
  // RUTAS DEL ADMINISTRADOR
  // ==========================================
  
  // El login se queda sin candado para que puedan entrar a loguearse
  { path: 'admin/login', component: LoginAdmin },

  // 2. LE PONEMOS EL CANDADO A TODO EL PANEL
  { 
    path: 'admin', 
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [AdminGuard] // <--- ESTO ES LO QUE FALTABA
  }
];