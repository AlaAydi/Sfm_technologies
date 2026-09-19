import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnomalyService, DeviceTelemetry } from '../../services/anomaly.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-sensors-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sensors-page.component.html',
  styleUrls: ['./sensors-page.component.css']
})
export class SensorsPageComponent implements OnInit {
  private anomalyService = inject(AnomalyService);
  private toastService = inject(ToastService);

  devices = signal<DeviceTelemetry[]>([]);
  loading = signal<boolean>(false);
  filterSearch = signal<string>('');
  filterStatus = signal<string>('');

  filteredDevices = computed(() => {
    let list = this.devices();
    const q = this.filterSearch().toLowerCase();
    const st = this.filterStatus();

    if (q) {
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q) ||
        d.zone.toLowerCase().includes(q)
      );
    }
    if (st) {
      list = list.filter(d => d.status === st);
    }
    return list;
  });

  onlineCount = computed(() => this.devices().filter(d => d.status === 'ONLINE').length);
  criticalCount = computed(() => this.devices().filter(d => d.status === 'CRITICAL').length);
  avgBattery = computed(() => {
    const list = this.devices();
    if (!list.length) return 0;
    return Math.round(list.reduce((acc, d) => acc + d.battery, 0) / list.length);
  });

  ngOnInit(): void {
    this.loadDevices();
  }

  loadDevices(): void {
    this.loading.set(true);
    this.anomalyService.getDevices().subscribe({
      next: (list) => {
        this.devices.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleValve(device: DeviceTelemetry): void {
    const nextState = device.valveState === 'OPEN' ? 'CLOSED' : 'OPEN';
    this.anomalyService.toggleValve(device.mac, nextState).subscribe(() => {
      this.loadDevices();
      if (nextState === 'CLOSED') {
        this.toastService.warning(
          'Vanne Fermée d\u0027urgence',
          `L\u0027alimentation en eau du compteur ${device.mac} (${device.name}) a été coupée.`
        );
      } else {
        this.toastService.success(
          'Vanne Rouverte',
          `L\u0027alimentation en eau du compteur ${device.mac} a été rétablie.`
        );
      }
    });
  }

  analyzeDevice(device: DeviceTelemetry): void {
    this.toastService.info('Analyse en cours', `Lancement du diagnostic IA pour ${device.mac}...`);
    this.anomalyService.triggerAnalysis(device.mac).subscribe({
      next: (res) => {
        this.toastService.success('Diagnostic IA Terminé', res.message);
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'CRITICAL': return 'badge-high';
      case 'WARNING': return 'badge-medium';
      case 'ONLINE': return 'badge-low';
      default: return 'badge-fp';
    }
  }

  getBatteryColor(battery: number): string {
    if (battery > 50) return 'var(--accent-green)';
    if (battery > 20) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  }
}
