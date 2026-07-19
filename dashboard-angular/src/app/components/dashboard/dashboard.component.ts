import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AnomalyService, DroppyAnomaly, PageResponse } from '../../services/anomaly.service';
import { WebsocketService } from '../../services/websocket.service';
import { LeakMapComponent } from '../leak-map/leak-map.component';
import { LeakChartComponent } from '../leak-chart/leak-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LeakMapComponent, LeakChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Data State
  anomalies = signal<DroppyAnomaly[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  loading = signal<boolean>(false);
  liveAlerts = signal<DroppyAnomaly[]>([]);
  unreadCount = signal<number>(0);

  // Stats computed from current page
  highCount = computed(() => this.anomalies().filter(a => a.severity === 'HIGH').length);
  mediumCount = computed(() => this.anomalies().filter(a => a.severity === 'MEDIUM').length);
  newCount = computed(() => this.anomalies().filter(a => a.status === 'NEW').length);

  // Filter State
  filterMac = '';
  filterStatus = '';
  filterSeverity = '';
  currentPage = 0;
  pageSize = 10;

  // Live WS subscription
  private wsSubscription?: Subscription;

  constructor(
    private anomalyService: AnomalyService,
    private wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.loadAnomalies();
    this.subscribeToLiveAnomalies();
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  loadAnomalies(): void {
    this.loading.set(true);
    this.anomalyService.getAnomalies({
      mac: this.filterMac || undefined,
      status: this.filterStatus || undefined,
      severity: this.filterSeverity || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: 'startAt',
      direction: 'desc'
    }).subscribe({
      next: (page: PageResponse<DroppyAnomaly>) => {
        this.anomalies.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading anomalies:', err);
        this.loading.set(false);
      }
    });
  }

  private subscribeToLiveAnomalies(): void {
    this.wsSubscription = this.wsService.getAnomalies().subscribe((anomaly: DroppyAnomaly) => {
      // Insert new alert at top of live feed
      this.liveAlerts.update(alerts => [anomaly, ...alerts.slice(0, 4)]);
      this.unreadCount.update(n => n + 1);

      // Auto-reload table if on first page
      if (this.currentPage === 0) {
        this.loadAnomalies();
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadAnomalies();
  }

  resetFilters(): void {
    this.filterMac = '';
    this.filterStatus = '';
    this.filterSeverity = '';
    this.currentPage = 0;
    this.loadAnomalies();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage = page;
      this.loadAnomalies();
    }
  }

  confirm(anomaly: DroppyAnomaly): void {
    this.anomalyService.updateStatus(anomaly.id, 'CONFIRMED').subscribe(() => {
      this.loadAnomalies();
    });
  }

  markFalsePositive(anomaly: DroppyAnomaly): void {
    this.anomalyService.updateStatus(anomaly.id, 'FALSE_POSITIVE').subscribe(() => {
      this.loadAnomalies();
    });
  }

  triggerAnalysis(): void {
    const mac = this.filterMac || '1C:69:20:35:73:C4';
    this.anomalyService.triggerAnalysis(mac).subscribe({
      next: () => console.log('Analysis triggered for MAC:', mac),
      error: (err) => console.error('Error triggering analysis:', err)
    });
  }

  clearAlerts(): void {
    this.liveAlerts.set([]);
    this.unreadCount.set(0);
  }

  getSeverityClass(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'NEW': return 'badge-new';
      case 'CONFIRMED': return 'badge-confirmed';
      case 'FALSE_POSITIVE': return 'badge-fp';
      default: return '';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'NIGHT_FLOW': return '🌙';
      case 'VALVE_INCONSISTENCY': return '⚙️';
      case 'FLOW_ANOMALY_IFOREST': return '🤖';
      case 'CONSUMPTION_DRIFT': return '📈';
      default: return '⚠️';
    }
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  get pages(): number[] {
    const total = this.totalPages();
    return Array.from({ length: Math.min(total, 7) }, (_, i) => i);
  }
}
