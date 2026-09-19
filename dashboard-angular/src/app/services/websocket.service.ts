import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { DroppyAnomaly } from './anomaly.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  
  // Real-time connection status signal
  connectionStatus = signal<'CONNECTED' | 'CONNECTING' | 'OFFLINE'>('CONNECTING');
  
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

  /**
   * Allows injecting a live anomaly event (e.g. from the WOW Leak Simulator)
   * into the real-time stream.
   */
  pushSimulatedAnomaly(anomaly: DroppyAnomaly): void {
    this.anomalySubject.next(anomaly);
  }

  pushSimulatedUpdate(anomaly: DroppyAnomaly): void {
    this.anomalyUpdateSubject.next(anomaly);
  }

  private connect(): void {
    if (typeof window === 'undefined') return;
    this.connectionStatus.set('CONNECTING');
    
    try {
      this.socket = new WebSocket('ws://localhost:8082/ws-raw');

      this.socket.onopen = () => {
        this.sendFrame('CONNECT', {
          'accept-version': '1.1,1.2',
          'heart-beat': '10000,10000'
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        this.connectionStatus.set('OFFLINE');
        setTimeout(() => this.connect(), 6000);
      };

      this.socket.onerror = () => {
        this.connectionStatus.set('OFFLINE');
      };
    } catch {
      this.connectionStatus.set('OFFLINE');
      setTimeout(() => this.connect(), 6000);
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
      this.connectionStatus.set('CONNECTED');
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
    this.sendFrame('SUBSCRIBE', {
      id: 'sub-anomalies',
      destination: '/topic/droppy/anomalies',
      ack: 'auto'
    });

    this.sendFrame('SUBSCRIBE', {
      id: 'sub-updates',
      destination: '/topic/droppy/anomalies/update',
      ack: 'auto'
    });
  }
}
