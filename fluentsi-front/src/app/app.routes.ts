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
  { path: 'leccion', component: CourseViewerComponent, canActivate: [AuthGuard] },
  { path: 'quiz', component: QuizComponent, canActivate: [AuthGuard] },
  { path: 'crear-curso', component: CreateCourseComponent, canActivate: [AuthGuard] }
];
