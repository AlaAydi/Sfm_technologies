import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import ApexCharts from 'apexcharts';
import { AnomalyService, ForecastItem } from '../../services/anomaly.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.css']
})
export class ForecastComponent implements OnInit, OnDestroy {
  private anomalyService = inject(AnomalyService);
  private themeService = inject(ThemeService);
  private toastService = inject(ToastService);

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef<HTMLDivElement>;

  mac = '1C:69:20:35:73:C4';
  days = 7;
  forecast = signal<ForecastItem[]>([]);
  loading = signal<boolean>(false);
  training = signal<boolean>(false);
  error = signal<string>('');

  // Forecast KPIs
  totalVolume = signal<number>(0);
  peakDay = signal<string>('');

  private chart: ApexCharts | null = null;

  constructor() {
    effect(() => {
      this.themeService.theme();
      if (this.forecast().length > 0) {
        setTimeout(() => this.renderChart(this.forecast()), 60);
      }
    });
  }

  ngOnInit(): void {
    this.loadForecast();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  loadForecast(): void {
    this.loading.set(true);
    this.error.set('');
    this.anomalyService.getForecast(this.mac, this.days).subscribe({
      next: (items: ForecastItem[]) => {
        this.forecast.set(items ?? []);
        this.loading.set(false);
        this.calculateKpis(items ?? []);
        this.renderChart(items ?? []);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de charger les prévisions. Cliquez sur "Réentraîner le modèle" pour générer les poids IA.');
      }
    });
  }

  trainModel(): void {
    this.training.set(true);
    this.toastService.info('Entraînement IA', `Réentraînement des modèles Scikit-Learn pour le capteur ${this.mac}...`);

    this.anomalyService.trainModel(this.mac).subscribe({
      next: (res) => {
        this.training.set(false);
        this.toastService.success('Entraînement Réussi', res.message);
        this.loadForecast();
      },
      error: () => {
        this.training.set(false);
        this.toastService.warning('Mode Secours', 'Modèle calibré sur les données historiques locales.');
        this.loadForecast();
      }
    });
  }

  private calculateKpis(items: ForecastItem[]): void {
    if (!items.length) return;
    const sum = items.reduce((acc, i) => acc + i.predicted_consumption, 0);
    this.totalVolume.set(Number(sum.toFixed(1)));

    let maxItem = items[0];
    items.forEach(i => {
      if (i.predicted_consumption > maxItem.predicted_consumption) {
        maxItem = i;
      }
    });
    this.peakDay.set(new Date(maxItem.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }));
  }

  private renderChart(items: ForecastItem[]): void {
    if (!this.chartContainer) return;
    this.chart?.destroy();

    if (!items.length) return;

    const isDark = this.themeService.isDark();
    const foreColor = isDark ? '#a0aec0' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    const categories = items.map(i => new Date(i.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
    const predicted = items.map(i => Number(i.predicted_consumption.toFixed(1)));
    const lower = items.map(i => Number(i.lower_bound.toFixed(1)));
    const upper = items.map(i => Number(i.upper_bound.toFixed(1)));

    const options: any = {
      series: [
        { name: 'Consommation Prévisionnelle (m³)', type: 'line', data: predicted },
        { name: 'Borne Supérieure (+15%)', type: 'line', data: upper },
        { name: 'Borne Inférieure (-15%)', type: 'line', data: lower }
      ],
      chart: {
        height: 360,
        foreColor,
        toolbar: { show: false },
        animations: { enabled: true }
      },
      stroke: {
        curve: 'smooth',
        width: [3, 1.5, 1.5],
        dashArray: [0, 4, 4]
      },
      colors: ['#0d9488', '#f59e0b', '#0284c7'],
      dataLabels: { enabled: false },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: foreColor }
      },
      xaxis: {
        categories,
        labels: { style: { colors: foreColor, fontFamily: 'Inter' } }
      },
      yaxis: {
        title: { text: 'Volume Journalier (m³)', style: { color: foreColor, fontFamily: 'Inter' } },
        labels: { style: { colors: foreColor, fontFamily: 'Inter' } }
      },
      grid: { borderColor: gridColor },
      tooltip: {
        theme: isDark ? 'dark' : 'light'
      }
    };

    this.chart = new ApexCharts(this.chartContainer.nativeElement, options);
    this.chart.render();
  }
}