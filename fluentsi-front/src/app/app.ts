import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Chatbot } from './chatbot/chatbot';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Chatbot],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('fluentsi-front');
}
