import { Routes } from '@angular/router';
import { Login } from './login/login';
import { CoursesComponent } from './courses/courses';
import { RevisionsComponent } from './revisions/revisions';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard';
import { MyAgendaComponent } from './agenda/agenda';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard';

export const routes: Routes = [
{ path: '', component: Login },
{ path: 'cursos', component: CoursesComponent },
{ path: 'revisiones', component: RevisionsComponent },
{ path: 'teacher-home', component: TeacherDashboardComponent },
{ path: 'agenda', component: MyAgendaComponent },
{ path: 'student-home', component: StudentDashboardComponent }
];