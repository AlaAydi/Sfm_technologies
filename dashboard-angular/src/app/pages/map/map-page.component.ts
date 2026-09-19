import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { DroppyAnomaly, PageResponse, AnomalyService, DeviceTelemetry } from '../../services/anomaly.service';
import { WebsocketService } from '../../services/websocket.service';
import { LeakMapComponent } from '../../components/leak-map/leak-map.component';

@Component({
  selector: 'app-map-page',
  standalone: true,
  imports: [CommonModule, LeakMapComponent],
  templateUrl: './map-page.component.html',
  styleUrls: ['./map-page.component.css']
})
export class MapPageComponent implements OnInit, OnDestroy {
  private anomalyService = inject(AnomalyService);
  private wsService = inject(WebsocketService);

  anomalies = signal<DroppyAnomaly[]>([]);
  devices = signal<DeviceTelemetry[]>([]);
  loading = signal<boolean>(true);

  activeZone = 'tunis-centre';
  currentCenter: [number, number] = [36.8065, 10.1815];
  currentZoom = 13;

  private wsSubscription?: Subscription;

  zones: { id: string; name: string; coords: [number, number]; zoom: number }[] = [
    { id: 'tunis-centre', name: 'Tunis Centre (Bourguiba / Bab Bhar)', coords: [36.8065, 10.1815], zoom: 14 },
    { id: 'ariana', name: 'Ariana (Ennasr / Soukra)', coords: [36.8665, 10.1647], zoom: 13 },
    { id: 'marsa', name: 'La Marsa / Gammarth', coords: [36.8782, 10.3247], zoom: 13 },
    { id: 'ben-arous', name: 'Ben Arous (Zone Industrielle)', coords: [36.7531, 10.2189], zoom: 13 },
    { id: 'all', name: 'Grand Tunis (Vue Générale)', coords: [36.8189, 10.2189], zoom: 11 }
  ];

  ngOnInit(): void {
    this.loadData();
    this.wsSubscription = this.wsService.getAnomalies().subscribe((anomaly) => {
      this.anomalies.update(list => [anomaly, ...list]);
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  selectZone(zone: typeof this.zones[0]): void {
    this.activeZone = zone.id;
    this.currentCenter = zone.coords;
    this.currentZoom = zone.zoom;
  }

  loadData(): void {
    this.anomalyService.getAnomalies({ page: 0, size: 100, sortBy: 'startAt', direction: 'desc' }).subscribe({
      next: (page: PageResponse<DroppyAnomaly>) => {
        this.anomalies.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.anomalyService.getDevices().subscribe(devs => {
      this.devices.set(devs);
    });
  }
}