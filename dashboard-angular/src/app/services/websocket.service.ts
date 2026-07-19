import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DroppyAnomaly } from './anomaly.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  private connected = false;
  private anomalySubject = new Subject<DroppyAnomaly>();
  private anomalyUpdateSubject = new Subject<DroppyAnomaly>();

  constructor() {
    this.connect();
  }

  getAnomalies(): Observable<DroppyAnomaly> {
    return this.anomalySubject.asObservable();
  }

  getAnomalyUpdates(): Observable<DroppyAnomaly> {
    return this.anomalyUpdateSubject.asObservable();
  }

  private connect(): void {
    console.log('Connecting to WebSocket...');
    try {
      this.socket = new WebSocket('ws://localhost:8082/ws-raw');

      this.socket.onopen = () => {
        console.log('WebSocket raw socket open. Sending STOMP CONNECT...');
        this.sendFrame('CONNECT', {
          'accept-version': '1.1,1.2',
          'heart-beat': '10000,10000'
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        console.warn('WebSocket connection closed. Retrying in 5 seconds...');
        this.connected = false;
        setTimeout(() => this.connect(), 5000);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setTimeout(() => this.connect(), 5000);
    }
  }

  private sendFrame(command: string, headers: { [key: string]: string }, body = ''): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    let frame = `${command}\n`;
    Object.entries(headers).forEach(([key, val]) => {
      frame += `${key}:${val}\n`;
    });
    frame += `\n${body}\0`;
    
    this.socket.send(frame);
  }

  private handleMessage(data: string): void {
    // Parse STOMP Frame
    const nullIdx = data.indexOf('\0');
    const frameStr = nullIdx !== -1 ? data.slice(0, nullIdx) : data;
    
    const parts = frameStr.split('\n\n');
    const headerLines = parts[0].split('\n');
    const command = headerLines[0].trim();
    
    const headers: { [key: string]: string } = {};
    for (let i = 1; i < headerLines.length; i++) {
      const line = headerLines[i];
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        headers[key] = val;
      }
    }
    
    const body = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

    if (command === 'CONNECTED') {
      console.log('STOMP CONNECTED successfully!');
      this.connected = true;
      this.subscribeToTopics();
    } else if (command === 'MESSAGE') {
      const destination = headers['destination'];
      if (body) {
        try {
          const parsedData = JSON.parse(body);
          if (destination === '/topic/droppy/anomalies') {
            this.anomalySubject.next(parsedData);
          } else if (destination === '/topic/droppy/anomalies/update') {
            this.anomalyUpdateSubject.next(parsedData);
          }
        } catch (e) {
          console.error('Failed to parse WS JSON message body:', e);
        }
      }
    }
  }

  private subscribeToTopics(): void {
    console.log('Subscribing to STOMP topics...');
    
    // Subscribe to new anomalies
    this.sendFrame('SUBSCRIBE', {
      id: 'sub-anomalies',
      destination: '/topic/droppy/anomalies',
      ack: 'auto'
    });

    // Subscribe to anomaly updates
    this.sendFrame('SUBSCRIBE', {
      id: 'sub-updates',
      destination: '/topic/droppy/anomalies/update',
      ack: 'auto'
    });
  }
}
