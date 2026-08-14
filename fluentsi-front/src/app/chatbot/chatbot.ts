import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { timeout, filter } from 'rxjs';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot {
  private cdr = inject(ChangeDetectorRef);

  isOpen = false;
  visible = true;
  mensaje = '';
  cargando = false;

  mensajes: ChatMessage[] = [
    { from: 'bot', text: "Hi! I'm Handy 👋, your FluentSí assistant. Ask me anything about English or the platform!" }
  ];

  private apiUrl = 'http://localhost:4000/api/chat';

  constructor(private http: HttpClient, private router: Router) {
    // Revisa la página cada vez que cambias de ruta
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.checkVisibility(e.urlAfterRedirects || e.url);
        this.cdr.markForCheck();
      });

    // Revisa también al cargar por primera vez
    this.checkVisibility(this.router.url);
  }

  // 🚫 Aquí defines dónde NO aparece Handy
  private checkVisibility(url: string) {
    const ocultarEn = ['login', 'register', 'admin'];
    const u = url.toLowerCase();
    this.visible = !ocultarEn.some((ruta) => u.includes(ruta));
    if (!this.visible) this.isOpen = false; // si se oculta, cierra el panel
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
    if (this.isOpen) this.scrollAbajo();
  }

  enviar() {
    const pregunta = this.mensaje.trim();
    if (!pregunta || this.cargando) return;

    this.mensajes.push({ from: 'user', text: pregunta });
    this.mensaje = '';
    this.cargando = true;
    this.cdr.markForCheck();
    this.scrollAbajo();

    this.http.post<any>(this.apiUrl, { question: pregunta })
      .pipe(timeout({ first: 25000 }))
      .subscribe({
        next: (res) => {
          this.cargando = false;
          this.mensajes.push({ from: 'bot', text: res?.answer || 'Sorry, I could not process that.' });
          this.cdr.markForCheck();
          this.scrollAbajo();
        },
        error: (err) => {
          this.cargando = false;
          console.error('Chatbot error:', err);
          this.mensajes.push({
            from: 'bot',
            text: "Oops! I couldn't respond 🙈. Please try again in a moment!"
          });
          this.cdr.markForCheck();
          this.scrollAbajo();
        }
      });
  }

  private scrollAbajo() {
    setTimeout(() => {
      const cont = document.querySelector('.chatbot-messages');
      if (cont) cont.scrollTop = cont.scrollHeight;
    }, 50);
  }
}