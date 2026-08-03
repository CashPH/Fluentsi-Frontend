import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './agenda.html',
  styleUrls: ['./agenda.css']
})
export class MyAgendaComponent implements OnInit, OnDestroy {
  enviarRetroalimentacion() {
    throw new Error('Method not implemented.');
  }
  
  revisiones: any;
  revisionSeleccionada: any;
  
  seleccionarRevision(_t28: any) {
    throw new Error('Method not implemented.');
  }

  // Se eliminó el arreglo "dias" duplicado y estático que causaba conflictos con el HTML

  private userSub: Subscription | null = null;
  private readonly API = 'http://localhost:4000/api';

  teacherId: number | null = null;
  cargando = true;

  // Semana actual
  semanaInicio: Date = this.getLunes(new Date());
  semanaInicioLabel: string = '';
  semanaFinLabel: string = '';

  // Única declaración de 'dias' con la interfaz correcta
  dias: { fecha: Date; label: string; activo: boolean }[] = [];

  // Día seleccionado
  diaSeleccionado: Date = new Date();

  // Sesiones del día seleccionado
  todasSesiones: any[] = [];

  // Se inyectaron HttpClient y ChangeDetectorRef aquí
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Generate day labels immediately so the week header renders on first display
    this.generarDias();
    this.actualizarEtiquetasSemana();
    this.cdr.detectChanges();

    this.userSub = this.authService.user$.subscribe(user => {
      if (user) {
        this.teacherId = Number(user.userId ?? user.id_instructor ?? user.id ?? null) || null;
        this.generarDias();
        this.actualizarEtiquetasSemana();
        this.cargarSesiones();
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  getLunes(d: Date): Date {
    const dia = new Date(d);
    const diaSemana = dia.getDay(); // 0=Dom, 1=Lun, ...
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    dia.setDate(dia.getDate() + diff);
    dia.setHours(0, 0, 0, 0);
    return dia;
  }

  generarDias(): void {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    this.dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(this.semanaInicio);
      d.setDate(d.getDate() + i);
      const esHoy = d.getTime() === hoy.getTime();
      this.dias.push({
        fecha: d,
        label: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        activo: esHoy || (i === 0 && d.getTime() === this.diaSeleccionado.getTime())
      });
    }

    const hoyEnSemana = this.dias.find(d => d.activo);
    this.diaSeleccionado = hoyEnSemana ? hoyEnSemana.fecha : this.dias[0].fecha;
  }

  cargarSesiones(): void {
    if (!this.teacherId) { this.cargando = false; return; }

    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);

    const fi = this.toISO(this.semanaInicio);
    const ff = this.toISO(fin);

    this.cargando = true;
    this.http.get<any[]>(`${this.API}/teacher/${this.teacherId}/sesiones?fecha_inicio=${fi}&fecha_fin=${ff}`).subscribe({
      // Se agregó el tipado explícito (data: any[]) para corregir el TS7006
      next: (data: any[]) => {
        this.todasSesiones = Array.isArray(data) ? data : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.todasSesiones = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get sesionesDelDia(): any[] {
    const selStr = this.toISO(this.diaSeleccionado);
    return this.todasSesiones.filter(s => {
      const f = s.fecha?.split('T')[0] || s.fecha;
      return f === selStr;
    });
  }

  tieneSesiones(dia: Date): boolean {
    const str = this.toISO(dia);
    return this.todasSesiones.some(s => (s.fecha?.split('T')[0] || s.fecha) === str);
  }

  seleccionarDia(dia: { fecha: Date; label: string; activo: boolean }): void {
    this.dias.forEach(d => d.activo = false);
    dia.activo = true;
    this.diaSeleccionado = dia.fecha;
    this.cdr.detectChanges();
  }

  semanaAnterior(): void {
    this.semanaInicio.setDate(this.semanaInicio.getDate() - 7);
    this.semanaInicio = new Date(this.semanaInicio);
    this.generarDias();
    this.cargarSesiones();
  }

  semanaSiguiente(): void {
    this.semanaInicio.setDate(this.semanaInicio.getDate() + 7);
    this.semanaInicio = new Date(this.semanaInicio);
    this.generarDias();
    this.cargarSesiones();
  }

  private toISO(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private actualizarEtiquetasSemana(): void {
    this.semanaInicioLabel = this.semanaInicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const fin = new Date(this.semanaInicio);
    fin.setDate(fin.getDate() + 6);
    this.semanaFinLabel = fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  logout(): void {
    this.authService.logout();
  }

  agendarCita(): void {
    this.router.navigate(['/agenda/agendar']);
  }
}