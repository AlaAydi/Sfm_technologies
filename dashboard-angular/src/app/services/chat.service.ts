import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  message: string;
}

export interface ChatReply {
  reply: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiBaseUrl = 'http://localhost:8082/api/v1/droppy/chat';

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<ChatReply> {
    return this.http.post<ChatReply>(this.apiBaseUrl, { message } as ChatMessage);
  }
}