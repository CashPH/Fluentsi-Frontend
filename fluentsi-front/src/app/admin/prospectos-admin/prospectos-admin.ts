import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface GrupoDifusion {
  id_grupo_difusion: number;
  nombre_grupo: string;
  descripcion: string;
  total_prospectos?: number;
  fecha_creacion: string;
  esGrupo: boolean;
}

export interface Prospecto {
  id_prospecto: number;
  nombre: string;
  ap_paterno: string;
  correo_electronico: string;
  telefono: string;
  mensaje: string;
  estado: string;
  fecha_registro: string;
  grupos_ids?: string;
  grupos_nombres?: string;
  esGrupo: boolean;
}

@Component({
  selector: 'app-prospectos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prospectos-admin.html',
  styleUrls: ['./prospectos-admin.css']
})
export class ProspectosAdmin implements OnInit {

  private apiUrl = 'http://localhost:4000/api/admin';

  prospectos: Prospecto[] = [];
  grupos: GrupoDifusion[] = [];

  tabActiva: string = 'todos';
  chatActivo: any = null;
  textoBusqueda: string = '';
  mensajeSaliente: string = '';

  mostrarModalGrupo: boolean = false;
  mostrarModalProspecto: boolean = false;

  nuevoGrupo = {
    nombre_grupo: '',
    descripcion: ''
  };

  nuevoProspecto = {
    nombre: '',
    ap_paterno: '',
    telefono: '',
    correo_electronico: '',
    ciudad: '',
    mensaje: ''
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('admin_token')}`);

    this.http.get<any>(`${this.apiUrl}/prospectos`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.prospectos = res.data.map((p: any) => ({ ...p, esGrupo: false }));
        }
      },
      error: (err) => console.error('Error al cargar prospectos', err)
    });

    this.http.get<any>(`${this.apiUrl}/grupos-difusion`, { headers }).subscribe({
      next: (res) => {
        if (res.success) {
          this.grupos = res.data.map((g: any) => ({ ...g, esGrupo: true }));
        }
      },
      error: (err) => console.error('Error al cargar grupos', err)
    });
  }
  // ==========================================
  // FUNCIÓN PARA ELIMINAR GRUPOS
  // ==========================================
  eliminarGrupo(idGrupo: number) {
    if (idGrupo === 1) {
      alert('⚠️ El grupo "Nuevos" es del sistema y no se puede eliminar.');
      return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar este grupo? (Los prospectos no se borrarán de la base de datos).')) {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('admin_token')}`);

      this.http.delete(`${this.apiUrl}/grupos-difusion/${idGrupo}`, { headers }).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.chatActivo = null; 
            this.cargarDatos(); 
          }
        },
        error: (err) => {
          console.error('Error al eliminar grupo', err);
          alert('Hubo un error al eliminar el grupo.');
        }
      });
    }
  }

  cambiarTab(tab: string) {
    this.tabActiva = tab;
    this.chatActivo = null;
  }

  get listaSidebar() {
    let lista: any[] = [];

    if (this.tabActiva === 'todos') {
      lista = [...this.grupos, ...this.prospectos];
    } else if (this.tabActiva === 'difusiones') {
      lista = [...this.grupos];
    } else if (this.tabActiva === 'sin_leer') {
      lista = this.prospectos.filter(p => p.estado === 'Pendiente');
    }

    if (this.textoBusqueda.trim() !== '') {
      const query = this.textoBusqueda.toLowerCase();
      lista = lista.filter(item => {
        if (item.esGrupo) {
          return item.nombre_grupo.toLowerCase().includes(query);
        } else {
          const nombreCompleto = `${item.nombre} ${item.ap_paterno}`.toLowerCase();
          return nombreCompleto.includes(query) || (item.telefono && item.telefono.includes(query));
        }
      });
    }

    return lista;
  }

  seleccionarChat(item: any) {
    this.chatActivo = item;
  }

  enviarMensaje() {
    if (!this.mensajeSaliente.trim() || !this.chatActivo) return;

    if (this.chatActivo.esGrupo) {
      console.log(`🚀 Preparando Bulk a Grupo ID: ${this.chatActivo.id_grupo_difusion}`);
      console.log(`Mensaje: ${this.mensajeSaliente}`);
      alert(`Simulación: Mensaje enviado a ${this.chatActivo.total_prospectos || 0} personas del grupo ${this.chatActivo.nombre_grupo}`);
    } else {
      console.log(`🚀 Enviando a Prospecto: ${this.chatActivo.telefono}`);
      console.log(`Mensaje: ${this.mensajeSaliente}`);
      alert(`Simulación: Mensaje enviado a ${this.chatActivo.nombre}`);
    }

    this.mensajeSaliente = '';
  }

  getIniciales(nombre: string, apellido: string): string {
    return (nombre.charAt(0) + (apellido ? apellido.charAt(0) : '')).toUpperCase();
  }

  abrirModalGrupo() {
    this.nuevoGrupo = { nombre_grupo: '', descripcion: '' };
    this.mostrarModalGrupo = true;
  }

  cerrarModalGrupo() {
    this.mostrarModalGrupo = false;
  }

  guardarGrupo() {
    if (!this.nuevoGrupo.nombre_grupo.trim()) {
      alert('El nombre del grupo es obligatorio');
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${localStorage.getItem('admin_token')}`);

    this.http.post(`${this.apiUrl}/grupos-difusion`, this.nuevoGrupo, { headers }).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cerrarModalGrupo();
          this.cargarDatos();
        }
      },
      error: (err) => {
        console.error('Error al crear grupo', err);
        alert('Hubo un error al crear el grupo.');
      }
    });
  }

  abrirModalProspecto() {
    this.nuevoProspecto = { nombre: '', ap_paterno: '', telefono: '', correo_electronico: '', ciudad: '', mensaje: '' };
    this.mostrarModalProspecto = true;
  }

  cerrarModalProspecto() {
    this.mostrarModalProspecto = false;
  }

  guardarProspecto() {
    if (!this.nuevoProspecto.nombre.trim() || !this.nuevoProspecto.telefono.trim()) {
      alert('El nombre y el teléfono son obligatorios');
      return;
    }

    this.http.post(`http://localhost:4000/api/web/prospectos`, this.nuevoProspecto).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.cerrarModalProspecto();
          this.cargarDatos();
        }
      },
      error: (err) => {
        console.error('Error al registrar prospecto', err);
        alert('Hubo un error al registrar el prospecto.');
      }
    });
  }
}