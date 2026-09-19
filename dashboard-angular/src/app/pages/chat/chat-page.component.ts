import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatbotComponent } from '../../components/chatbot/chatbot.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatbotComponent],
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})
export class ChatPageComponent {}