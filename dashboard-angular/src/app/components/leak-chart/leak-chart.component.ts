import { 
  Component, 
  OnInit, 
  OnChanges, 
  OnDestroy, 
  Input, 
  SimpleChanges, 
  ElementRef, 
  ViewChild, 
  inject, 
  effect 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import ApexCharts from 'apexcharts';
import { DroppyAnomaly } from '../../services/anomaly.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-leak-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container glass-card">
      <div class="chart-header">
        <div>
          <h3 class="chart-title">📈 Analyse du Débit & Détection d'Anomalies (24h)</h3>
          <p class="chart-subtitle text-muted">Surveillance continue des zones de débit critique et seuil MNF</p>
        </div>
        <div class="chart-legend-pills">
          <span class="pill-item"><span class="pill-dot" style="background:#0d9488"></span> Débit Normal</span>
          <span class="pill-item"><span class="pill-dot" style="background:#ef4444"></span> Fuite Détectée</span>
          <span class="pill-item"><span class="pill-dot" style="background:#f59e0b"></span> Seuil Alerte</span>
        </div>
      </div>
      <div #chartElement class="chart-body"></div>
    </div>
  `,
  styles: [`
    .chart-container {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: 100%;
      min-height: 420px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }
    .chart-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 2px;
    }
    .chart-subtitle {
      font-size: 12px;
    }
    .chart-legend-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .pill-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      padding: 3px 8px;
      border-radius: 999px;
    }
    .pill-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .chart-body {
      flex: 1;
      width: 100%;
      min-height: 320px;
    }
  `]
})
export class LeakChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() anomalies: DroppyAnomaly[] = [];
  @ViewChild('chartElement', { static: true }) chartElement!: ElementRef<HTMLDivElement>;

  private chart: ApexCharts | null = null;
  themeService = inject(ThemeService);

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.chart) {
        setTimeout(() => this.renderChart(), 50);
      }
    });
  }

  ngOnInit(): void {
    setTimeout(() => this.renderChart(), 80);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anomalies'] && !changes['anomalies'].firstChange) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private renderChart(): void {
    if (!this.chartElement) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const isDark = this.themeService.isDark();
    const foreColor = isDark ? '#a0aec0' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const primaryLineColor = isDark ? '#4fd1c5' : '#0d9488';

    const dataPoints: { x: number; y: number }[] = [];
    const baseTime = new Date().setHours(0, 0, 0, 0);

    // Realistic 24-hour diurnal water consumption curve
    const hourlyProfiles = [
      0.8, 0.7, 0.6, 0.6, 0.7, 1.4, // 00h - 05h (Night minimum flow)
      2.8, 4.2, 4.5, 3.8, 3.2, 3.0, // 06h - 11h (Morning peak)
      3.4, 3.6, 2.9, 2.7, 2.8, 3.5, // 12h - 17h (Midday demand)
      4.6, 4.8, 4.1, 3.2, 2.1, 1.2  // 18h - 23h (Evening peak)
    ];

    for (let i = 0; i < 24; i++) {
      const time = baseTime + i * 3600 * 1000;
      let rate = hourlyProfiles[i] + (Math.sin(i) * 0.15);
      dataPoints.push({ x: time, y: Number(rate.toFixed(2)) });
    }

    // Build annotations based on real/simulated anomalies
    const xAnnotations: any[] = [];
    this.anomalies.forEach((anomaly) => {
      if (anomaly.status === 'NEW' || anomaly.status === 'CONFIRMED') {
        const startTimestamp = new Date(anomaly.startAt).getTime();
        const endTimestamp = new Date(anomaly.endAt).getTime();
        const isCrit = anomaly.severity === 'HIGH';

        xAnnotations.push({
          x: startTimestamp,
          x2: endTimestamp,
          fillColor: isCrit ? '#ef4444' : '#f59e0b',
          opacity: 0.2,
          label: {
            borderColor: isCrit ? '#ef4444' : '#f59e0b',
            style: {
              color: '#fff',
              background: isCrit ? '#ef4444' : '#f59e0b',
              fontSize: '10px',
              fontWeight: '600',
              fontFamily: 'Inter'
            },
            text: anomaly.type === 'NIGHT_FLOW' ? 'Fuite Nocturne' : 'Anomalie IA'
          }
        });
      }
    });

    if (xAnnotations.length === 0) {
      // Default alert window
      xAnnotations.push({
        x: baseTime + 2 * 3600 * 1000,
        x2: baseTime + 5 * 3600 * 1000,
        fillColor: '#ef4444',
        opacity: 0.2,
        label: {
          borderColor: '#ef4444',
          style: { color: '#fff', background: '#ef4444', fontSize: '10px', fontWeight: 'bold' },
          text: 'Seuil MNF Dépassé (2h-5h)'
        }
      });
    }

    const options: any = {
      series: [
        {
          name: 'Débit Mesuré (L/min)',
          data: dataPoints
        }
      ],
      chart: {
        height: 330,
        type: 'area',
        foreColor: foreColor,
        toolbar: { show: false },
        animations: { enabled: true }
      },
      colors: [primaryLineColor],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: isDark ? 0.45 : 0.35,
          opacityTo: 0.05,
          stops: [0, 95, 100]
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: { enabled: false },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          format: 'HH:mm',
          style: { colors: foreColor, fontFamily: 'Inter' }
        },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor }
      },
      yaxis: {
        title: { text: 'Débit (L/min)', style: { color: foreColor, fontFamily: 'Inter', fontWeight: 500 } },
        labels: { style: { colors: foreColor, fontFamily: 'Inter' } }
      },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 3
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: { format: 'dd MMM - HH:mm' }
      },
      annotations: {
        xaxis: xAnnotations,
        yaxis: [
          {
            y: 3.8,
            borderColor: '#ef4444',
            strokeDashArray: 4,
            label: {
              borderColor: '#ef4444',
              style: { color: '#fff', background: '#ef4444', fontSize: '10px' },
              text: 'Seuil Critique (3.8 L/min)'
            }
          }
        ]
      }
    };

    this.chart = new ApexCharts(this.chartElement.nativeElement, options);
    this.chart.render();
  }
}
