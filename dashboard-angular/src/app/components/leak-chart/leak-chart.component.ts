import { Component, OnInit, OnChanges, OnDestroy, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import ApexCharts from 'apexcharts';
import { DroppyAnomaly } from '../../services/anomaly.service';

@Component({
  selector: 'app-leak-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container glass-card">
      <h3 class="chart-title">📈 Analyse du Débit & Anomalies Surlignées</h3>
      <div id="chart"></div>
    </div>
  `,
  styles: [`
    .chart-container {
      padding: 24px;
      margin-bottom: 24px;
      width: 100%;
    }
    .chart-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 16px;
    }
  `]
})
export class LeakChartComponent implements OnInit, OnChanges, OnDestroy {
  @Input() anomalies: DroppyAnomaly[] = [];

  private chart: ApexCharts | null = null;

  ngOnInit(): void {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anomalies'] && !changes['anomalies'].firstChange) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private renderChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const dataPoints: { x: number; y: number }[] = [];
    const baseTime = new Date().setHours(0, 0, 0, 0);

    for (let i = 0; i < 24; i++) {
      const time = baseTime + i * 3600 * 1000;
      let rate = 0.5 + Math.random() * 0.8;
      if (i >= 11 && i <= 14) rate += 2.5; 
      if (i >= 18 && i <= 21) rate += 3.0; 
      if (i >= 2 && i <= 5) rate += 1.8; 
      
      dataPoints.push({ x: time, y: Number(rate.toFixed(2)) });
    }

    const xAnnotations: any[] = [];
    this.anomalies.forEach((anomaly) => {
      if (anomaly.status === 'NEW') {
        const startTimestamp = new Date(anomaly.startAt).getTime();
        const endTimestamp = new Date(anomaly.endAt).getTime();
        
        xAnnotations.push({
          x: startTimestamp,
          x2: endTimestamp,
          fillColor: anomaly.severity === 'HIGH' ? '#fc8181' : '#f6ad55',
          opacity: 0.25,
          label: {
            borderColor: anomaly.severity === 'HIGH' ? '#fc8181' : '#f6ad55',
            style: {
              color: '#fff',
              background: anomaly.severity === 'HIGH' ? '#fc8181' : '#f6ad55',
              fontSize: '10px',
              fontFamily: 'Inter'
            },
            text: anomaly.type === 'NIGHT_FLOW' ? 'Fuite Nocturne (MNF)' : 'Anomalie IA'
          }
        });
      }
    });

    if (xAnnotations.length === 0) {
      xAnnotations.push({
        x: baseTime + 2 * 3600 * 1000,
        x2: baseTime + 5 * 3600 * 1000,
        fillColor: '#fc8181',
        opacity: 0.25,
        label: {
          borderColor: '#fc8181',
          style: { color: '#fff', background: '#fc8181', fontSize: '10px' },
          text: 'Fuite Nocturne IA'
        }
      });
    }

    const options: any = {
      series: [
        {
          name: 'Débit (L/min)',
          data: dataPoints
        }
      ],
      chart: {
        height: 320,
        type: 'line',
        foreColor: '#a0aec0',
        toolbar: { show: false },
        animations: { enabled: true },
        zoom: { enabled: false }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          style: { colors: '#a0aec0', fontFamily: 'Inter' }
        }
      },
      yaxis: {
        title: { text: 'Débit (L/min)', style: { color: '#a0aec0', fontFamily: 'Inter' } },
        labels: { style: { colors: '#a0aec0', fontFamily: 'Inter' } }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      colors: ['#4fd1c5'],
      annotations: {
        xaxis: xAnnotations,
        yaxis: [
          {
            y: 3.5,
            borderColor: '#fc8181',
            strokeDashArray: 4,
            label: {
              borderColor: '#fc8181',
              style: { color: '#fff', background: '#fc8181' },
              text: 'Seuil Critique'
            }
          }
        ]
      }
    };

    const element = document.querySelector('#chart');
    if (element) {
      this.chart = new ApexCharts(element as any, options);
      this.chart.render();
    }
  }
}
