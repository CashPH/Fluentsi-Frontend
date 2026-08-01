import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AdminGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate(): boolean {
        const adminToken = localStorage.getItem('admin_token');

        if (adminToken) {
            return true; 
        } else {

            this.router.navigate(['/admin/login']);
            return false;
        }
    }
}