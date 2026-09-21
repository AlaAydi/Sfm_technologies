import { Component, OnInit, Input, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

export interface ChatBubble {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  @Input() mode: 'floating' | 'page' = 'floating';
  @ViewChild('scrollArea') scrollArea?: ElementRef;

  open = signal(false);
  messages = signal<ChatBubble[]>([]);
  input = signal('');
  loading = signal(false);

  suggestions: string[] = [
    'Résume les dernières anomalies',
    'Que signifie une anomalie NIGHT_FLOW ?',
    'Donne un état global du système',
    'Comment fonctionne la détection ?'
  ];

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.messages.set([{
      role: 'assistant',
      content: '👋 Bonjour ! Je suis l\u0027assistant Droppy. Je peux vous renseigner sur les anomalies détectées, leur sévérité, leur statut et le fonctionnement du système de détection. Comment puis-je vous aider ?'
    }]);
  }

  toggle(): void {
    this.open.set(!this.open());
    if (this.open()) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  isOpen(): boolean {
    return this.mode === 'page' || this.open();
  }

  send(text?: string): void {
    const content = (text ?? this.input()).trim();
    if (!content || this.loading()) return;

    this.messages.update(list => [...list, { role: 'user', content }]);
    this.input.set('');
    this.loading.set(true);
    this.scrollToBottom();

    this.chatService.sendMessage(content).subscribe({
      next: (res) => {
        this.messages.update(list => [...list, { role: 'assistant', content: res.reply }]);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.messages.update(list => [...list, {
          role: 'assistant',
          content: this.getChatErrorMessage(err)
        }]);
        this.loading.set(false);
        this.scrollToBottom();
      }
    });
  }

  clear(): void {
    this.messages.set([{
      role: 'assistant',
      content: '👋 Nouvelle conversation. Comment puis-je vous aider ?'
    }]);
  }

  private getChatErrorMessage(error: { status?: number }): string {
    if (error.status === 503) {
      return '⚠️ Le service IA est momentanément très sollicité. Réessayez dans quelques instants.';
    }
    return '😕 Je n\u0027ai pas pu joindre le serveur Droppy. Vérifiez que le backend est démarré et que GEMINI_API_KEY est configurée dans le fichier .env.';
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.scrollArea?.nativeElement?.scrollTo({
        top: this.scrollArea.nativeElement.scrollHeight,
        behavior: 'smooth'
      });
    });
  }
}
