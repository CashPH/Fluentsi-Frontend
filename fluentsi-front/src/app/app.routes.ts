import { Routes } from '@angular/router';
import { Login } from './login/login';
import { CoursesComponent } from './courses/courses'; 

export const routes: Routes = [
{ path: '', component: Login },
{ path: 'cursos', component: CoursesComponent }
];