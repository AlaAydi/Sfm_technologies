import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import ApexCharts from 'apexcharts';
import { AnomalyService } from '../../services/anomaly.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.css']
})
export class ReportsPageComponent implements OnInit, OnDestroy {
  private anomalyService = inject(AnomalyService);
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);

  @ViewChild('mnfChartRef', { static: true }) mnfChartRef!: ElementRef<HTMLDivElement>;
  private mnfChart: ApexCharts | null = null;

  // Executive Metrics
  totalSavedM3 = 142.6;
  totalLostM3 = 24.3;
  financialSavingsTND = (142.6 * 2.85).toFixed(2);
  mttrHours = '1h 35m';
  networkEfficiency = 94.6;

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.mnfChart) {
        setTimeout(() => this.renderMnfChart(), 50);
      }
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.renderMnfChart();
    }, 60);
  }

  ngOnDestroy(): void {
    this.mnfChart?.destroy();
  }

  printReport(): void {
    window.print();
  }

  exportAudit(): void {
    this.anomalyService.getAnomalies({ size: 100 }).subscribe(res => {
      this.anomalyService.exportToCsv(res.content);
      this.toastService.success('Export réussi', 'Le rapport d\u0027audit complet a été téléchargé en CSV.');
    });
  }

  private renderMnfChart(): void {
    if (!this.mnfChartRef) return;
    this.mnfChart?.destroy();

    const isDark = this.themeService.isDark();
    const foreColor = isDark ? '#a0aec0' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // Simulated 30-day Night Minimum Flow data (02:00 - 05:00)
    const dates: string[] = [];
    const values: number[] = [];
    const threshold: number[] = [];

    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.push(d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));

      // Baseline MNF around 0.6 - 0.8, with 2 spikes where leaks occurred
      let val = 0.65 + Math.sin(i * 0.5) * 0.12;
      if (i === 14) val = 1.95; // historical leak 1
      if (i === 4) val = 2.45;  // recent leak 2
      values.push(Number(val.toFixed(2)));
      threshold.push(1.2);
    }

    const options: any = {
      series: [
        { name: 'Débit Nocturne Minimal (m³/h)', data: values },
        { name: 'Seuil Critique MNF', data: threshold }
      ],
      chart: {
        height: 320,
        type: 'line',
        foreColor,
        toolbar: { show: false },
        animations: { enabled: true }
      },
      colors: ['#0d9488', '#ef4444'],
      stroke: {
        curve: 'smooth',
        width: [3, 2],
        dashArray: [0, 4]
      },
      xaxis: {
        categories: dates,
        labels: { style: { colors: foreColor, fontFamily: 'Inter' } }
      },
      yaxis: {
        title: { text: 'MNF (m³/h)', style: { color: foreColor, fontFamily: 'Inter' } },
        labels: { style: { colors: foreColor, fontFamily: 'Inter' } }
      },
      grid: { borderColor: gridColor },
      tooltip: {
        theme: isDark ? 'dark' : 'light'
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: foreColor }
      }
    };

    this.mnfChart = new ApexCharts(this.mnfChartRef.nativeElement, options);
    this.mnfChart.render();
  }
}
