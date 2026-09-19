import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AnomalyService, DroppyAnomaly, PageResponse } from '../../services/anomaly.service';
import { WebsocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { AnomalyDrawerComponent } from '../../components/anomaly-drawer/anomaly-drawer.component';

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [CommonModule, FormsModule, AnomalyDrawerComponent],
  templateUrl: './anomalies.component.html',
  styleUrls: ['./anomalies.component.css']
})
export class AnomaliesComponent implements OnInit, OnDestroy {
  private anomalyService = inject(AnomalyService);
  private wsService = inject(WebsocketService);
  private toastService = inject(ToastService);

  anomalies = signal<DroppyAnomaly[]>([]);
  totalElements = signal<number>(0);
  totalPages = signal<number>(0);
  loading = signal<boolean>(false);
  selectedAnomaly = signal<DroppyAnomaly | null>(null);

  highCount = computed(() => this.anomalies().filter(a => a.severity === 'HIGH').length);
  mediumCount = computed(() => this.anomalies().filter(a => a.severity === 'MEDIUM').length);
  newCount = computed(() => this.anomalies().filter(a => a.status === 'NEW').length);

  // Filters
  filterSearch = '';
  filterMac = '';
  filterStatus = '';
  filterSeverity = '';
  filterStartDate = '';
  filterEndDate = '';

  currentPage = 0;
  pageSize = 8;
  sortBy = 'startAt';
  direction: 'asc' | 'desc' = 'desc';

  private wsSubscription?: Subscription;
  liveCount = signal<number>(0);

  ngOnInit(): void {
    this.loadAnomalies();
    this.wsSubscription = this.wsService.getAnomalies().subscribe((anomaly: DroppyAnomaly) => {
      this.liveCount.update(n => n + 1);
      if (this.currentPage === 0) {
        this.loadAnomalies();
      }
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  loadAnomalies(): void {
    this.loading.set(true);
    this.anomalyService.getAnomalies({
      search: this.filterSearch || undefined,
      mac: this.filterMac || undefined,
      status: this.filterStatus || undefined,
      severity: this.filterSeverity || undefined,
      start: this.filterStartDate || undefined,
      end: this.filterEndDate || undefined,
      page: this.currentPage,
      size: this.pageSize,
      sortBy: this.sortBy,
      direction: this.direction
    }).subscribe({
      next: (page: PageResponse<DroppyAnomaly>) => {
        this.anomalies.set(page.content);
        this.totalElements.set(page.totalElements);
        this.totalPages.set(page.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadAnomalies();
  }

  resetFilters(): void {
    this.filterSearch = '';
    this.filterMac = '';
    this.filterStatus = '';
    this.filterSeverity = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.currentPage = 0;
    this.loadAnomalies();
  }

  sort(column: string): void {
    if (this.sortBy === column) {
      this.direction = this.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.direction = 'desc';
    }
    this.loadAnomalies();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.currentPage = page;
      this.loadAnomalies();
    }
  }

  openDetails(anomaly: DroppyAnomaly): void {
    this.selectedAnomaly.set(anomaly);
  }

  closeDetails(): void {
    this.selectedAnomaly.set(null);
  }

  confirm(anomaly: DroppyAnomaly, event?: Event): void {
    event?.stopPropagation();
    this.anomalyService.updateStatus(anomaly.id, 'CONFIRMED').subscribe(() => {
      this.toastService.success('Fuite Confirmée', `Anomalie #${anomaly.id} validée comme fuite active.`);
      this.closeDetails();
      this.loadAnomalies();
    });
  }

  markFalsePositive(anomaly: DroppyAnomaly, event?: Event): void {
    event?.stopPropagation();
    this.anomalyService.updateStatus(anomaly.id, 'FALSE_POSITIVE').subscribe(() => {
      this.toastService.info('Faux Positif Enregistré', `Anomalie #${anomaly.id} classée comme fausse alerte.`);
      this.closeDetails();
      this.loadAnomalies();
    });
  }

  exportCsv(): void {
    this.anomalyService.exportToCsv(this.anomalies());
    this.toastService.success('Export CSV', `${this.anomalies().length} anomalies exportées en CSV.`);
  }

  exportJson(): void {
    this.anomalyService.exportToJson(this.anomalies());
    this.toastService.success('Export JSON', `${this.anomalies().length} anomalies exportées en JSON.`);
  }

  get visiblePages(): number[] {
    const total = this.totalPages();
    const current = this.currentPage;
    const maxVisible = 5;
    
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i);
    }
    
    let start = Math.max(0, current - 2);
    let end = Math.min(total - 1, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(0, end - maxVisible + 1);
    }
    
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getSeverityClass(severity: string): string {
    return severity === 'HIGH' ? 'badge-high' : severity === 'MEDIUM' ? 'badge-medium' : 'badge-low';
  }

  getStatusClass(status: string): string {
    return status === 'NEW' ? 'badge-new' : status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-fp';
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
}