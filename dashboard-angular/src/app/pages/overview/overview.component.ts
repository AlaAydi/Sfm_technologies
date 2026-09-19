import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DroppyAnomaly, PageResponse, AnomalyService, DeviceTelemetry } from '../../services/anomaly.service';
import { WebsocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { LeakMapComponent } from '../../components/leak-map/leak-map.component';
import { LeakChartComponent } from '../../components/leak-chart/leak-chart.component';
import { AnomalyDrawerComponent } from '../../components/anomaly-drawer/anomaly-drawer.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, LeakMapComponent, LeakChartComponent, AnomalyDrawerComponent],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit, OnDestroy {
  private anomalyService = inject(AnomalyService);
  private wsService = inject(WebsocketService);
  private toastService = inject(ToastService);

  anomalies = signal<DroppyAnomaly[]>([]);
  devices = signal<DeviceTelemetry[]>([]);
  totalElements = signal<number>(0);
  loading = signal<boolean>(false);
  selectedAnomaly = signal<DroppyAnomaly | null>(null);

  highCount = computed(() => this.anomalies().filter(a => a.severity === 'HIGH').length);
  mediumCount = computed(() => this.anomalies().filter(a => a.severity === 'MEDIUM').length);
  newCount = computed(() => this.anomalies().filter(a => a.status === 'NEW').length);

  // Hydrodynamic savings KPI
  totalLostM3 = computed(() => {
    return Number(this.anomalies().reduce((acc, a) => acc + (a.estimatedLossM3 || 3.2), 0).toFixed(1));
  });

  severities = ['HIGH', 'MEDIUM', 'LOW'];
  private wsSubscription?: Subscription;

  ngOnInit(): void {
    this.loadOverview();
    this.loadDevices();
    this.wsSubscription = this.wsService.getAnomalies().subscribe((anomaly: DroppyAnomaly) => {
      this.anomalies.update(list => [anomaly, ...list]);
      this.totalElements.update(n => n + 1);
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  loadOverview(): void {
    this.loading.set(true);
    this.anomalyService.getAnomalies({ page: 0, size: 50, sortBy: 'startAt', direction: 'desc' }).subscribe({
      next: (page: PageResponse<DroppyAnomaly>) => {
        this.anomalies.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadDevices(): void {
    this.anomalyService.getDevices().subscribe(devs => this.devices.set(devs));
  }

  openDetails(anomaly: DroppyAnomaly): void {
    this.selectedAnomaly.set(anomaly);
  }

  closeDetails(): void {
    this.selectedAnomaly.set(null);
  }

  confirmAnomaly(anomaly: DroppyAnomaly): void {
    this.anomalyService.updateStatus(anomaly.id, 'CONFIRMED').subscribe({
      next: () => {
        this.toastService.success('Fuite Confirmée', `L'anomalie #${anomaly.id} a été confirmée et transmise aux équipes terrain.`);
        this.closeDetails();
        this.loadOverview();
      }
    });
  }

  markFalsePositive(anomaly: DroppyAnomaly): void {
    this.anomalyService.updateStatus(anomaly.id, 'FALSE_POSITIVE').subscribe({
      next: () => {
        this.toastService.info('Faux Positif Classé', `L'anomalie #${anomaly.id} a été répertoriée comme faux positif.`);
        this.closeDetails();
        this.loadOverview();
      }
    });
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'HIGH': return 'Fuite Critique (Haute)';
      case 'MEDIUM': return 'Suspicion Fuite (Moyenne)';
      default: return 'Surveillance Normale (Basse)';
    }
  }

  severityCount(severity: string): number {
    return this.anomalies().filter(a => a.severity === severity).length;
  }

  severityPercent(severity: string): number {
    const listLen = this.anomalies().length;
    if (listLen === 0) return 0;
    return Math.round((this.severityCount(severity) / listLen) * 100);
  }
}