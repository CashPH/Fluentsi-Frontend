import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getUser();
      // Redirige según el rol del usuario
      if (user?.role === 'teacher') {
        this.router.navigate(['/teacher-home']);
      } else {
        this.router.navigate(['/student-home']);
      }
      return false;
    }
    return true;
  }
}
