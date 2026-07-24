
import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout/admin-layout';
import { MainDashboard } from './main-dashboard/main-dashboard';
import { InstructoresAdminComponent } from './instructores-admin/instructores-admin';
import { AdministradoresAdminComponent } from './administradores-admin/administradores-admin';
import { ProspectosAdmin } from './prospectos-admin/prospectos-admin';
import { LoginAdmin } from './login-admin/login-admin';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: LoginAdmin },
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: 'dashboard', component: MainDashboard },
      { path: 'instructores', component: InstructoresAdminComponent },
      { path: 'administradores', component: AdministradoresAdminComponent },
      { path: 'prospectos', component: ProspectosAdmin },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];