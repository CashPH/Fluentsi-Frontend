import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  
  
  private baseUrl = 'http://localhost:4000/api/admin/dashboard'; 

  getMetrics(): Observable<any> {
    return this.http.get(`${this.baseUrl}/metrics`);
  }

  
  getProspectosRecientes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/prospectos-recientes`);
  }


  getInstructores(): Observable<any> {
    return this.http.get('http://localhost:4000/api/admin/instructores');
  }

  
  crearInstructor(datosInstructor: any): Observable<any> {
    return this.http.post('http://localhost:4000/api/admin/instructores', datosInstructor);
  }

  
  actualizarInstructor(id: number, datosInstructor: any): Observable<any> {
    return this.http.put(`http://localhost:4000/api/admin/instructores/${id}`, datosInstructor);
  }

  
  eliminarInstructor(id: number): Observable<any> {
    return this.http.delete(`http://localhost:4000/api/admin/instructores/${id}`);
  }

// ==========================================
  // MÉTODOS PARA ADMINISTRADORES
  // ==========================================
  getAdministradores(): Observable<any> {
    return this.http.get('http://localhost:4000/api/admin/administradores');
  }

  crearAdministrador(datosAdmin: any): Observable<any> {
    return this.http.post('http://localhost:4000/api/admin/administradores', datosAdmin);
  }

  actualizarAdministrador(id: number, datosAdmin: any): Observable<any> {
    return this.http.put(`http://localhost:4000/api/admin/administradores/${id}`, datosAdmin);
  }

  eliminarAdministrador(id: number): Observable<any> {
    return this.http.delete(`http://localhost:4000/api/admin/administradores/${id}`);
  }

}
