import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input, 
  OnChanges, 
  SimpleChanges, 
  ElementRef, 
  ViewChild, 
  inject, 
  effect 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { DroppyAnomaly, DeviceTelemetry } from '../../services/anomaly.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-leak-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-card-wrapper glass-card">
      <div class="map-topbar">
        <div class="map-title-row">
          <span class="map-icon">🛰️</span>
          <span class="map-title">Surveillance Géospatiale du Réseau Eau</span>
        </div>
        <div class="map-controls">
          <button class="layer-pill" [class.active]="currentLayer === 'standard'" (click)="setTileLayer('standard')">
            Plan
          </button>
          <button class="layer-pill" [class.active]="currentLayer === 'satellite'" (click)="setTileLayer('satellite')">
            Satellite
          </button>
          <button class="layer-pill reset" (click)="resetView()" title="Centrer sur Tunis">
            🎯 Recadrer
          </button>
        </div>
      </div>
      <div #mapContainer class="map-viewport"></div>
    </div>
  `,
  styles: [`
    .map-card-wrapper {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      height: 100%;
      min-height: 420px;
    }
    .map-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .map-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .map-icon { font-size: 18px; }
    .map-controls {
      display: flex;
      gap: 6px;
    }
    .layer-pill {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .layer-pill:hover {
      color: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .layer-pill.active {
      background: rgba(99, 179, 237, 0.18);
      color: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .map-viewport {
      flex: 1;
      width: 100%;
      min-height: 360px;
      border-radius: var(--radius-md);
      z-index: 1;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
  `]
})
export class LeakMapComponent implements OnInit, OnDestroy, OnChanges {
  @Input() anomalies: DroppyAnomaly[] = [];
  @Input() devices: DeviceTelemetry[] = [];
  @Input() centerCoords: [number, number] = [36.8065, 10.1815]; // Tunis
  @Input() zoomLevel = 12;

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private tileLayer: L.TileLayer | null = null;

  themeService = inject(ThemeService);
  currentLayer: 'standard' | 'satellite' = 'standard';

  private defaultDevices: DeviceTelemetry[] = [
    {
      mac: '1C:69:20:35:73:C4',
      name: 'Station Tunis Centre - Bourguiba',
      zone: 'Tunis Centre',
      coordinates: [36.8065, 10.1815],
      status: 'CRITICAL',
      battery: 92,
      rssi: -64,
      pressure: 3.4,
      currentFlow: 4.8,
      valveState: 'OPEN',
      lastPing: 'Il y a 2 min',
      totalConsumptionM3: 1845.2
    },
    {
      mac: '2A:44:88:12:90:F1',
      name: 'Station Ariana - Ennasr 2',
      zone: 'Ariana',
      coordinates: [36.8665, 10.1647],
      status: 'WARNING',
      battery: 78,
      rssi: -72,
      pressure: 4.1,
      currentFlow: 2.1,
      valveState: 'OPEN',
      lastPing: 'Il y a 5 min',
      totalConsumptionM3: 924.6
    },
    {
      mac: '3B:77:99:34:AA:12',
      name: 'Station La Marsa - Corniche',
      zone: 'La Marsa',
      coordinates: [36.8782, 10.3247],
      status: 'ONLINE',
      battery: 85,
      rssi: -58,
      pressure: 3.8,
      currentFlow: 1.2,
      valveState: 'OPEN',
      lastPing: 'Il y a 1 min',
      totalConsumptionM3: 1240.0
    },
    {
      mac: '4C:11:55:78:BB:33',
      name: 'Station Ben Arous - Z.I.',
      zone: 'Ben Arous',
      coordinates: [36.7531, 10.2189],
      status: 'ONLINE',
      battery: 64,
      rssi: -81,
      pressure: 4.6,
      currentFlow: 0.4,
      valveState: 'OPEN',
      lastPing: 'Il y a 7 min',
      totalConsumptionM3: 3120.8
    },
    {
      mac: '5D:22:66:99:CC:44',
      name: 'Station Berges du Lac 2',
      zone: 'Lac 2',
      coordinates: [36.8361, 10.2372],
      status: 'ONLINE',
      battery: 95,
      rssi: -55,
      pressure: 3.6,
      currentFlow: 1.7,
      valveState: 'OPEN',
      lastPing: 'Il y a 3 min',
      totalConsumptionM3: 845.3
    }
  ];

  constructor() {
    // Automatically switch tile appearance when theme changes
    effect(() => {
      this.themeService.theme();
      if (this.map && this.currentLayer === 'standard') {
        this.updateBaseTile();
      }
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 50);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['anomalies'] || changes['devices']) && this.map) {
      this.renderMarkers();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer || this.map) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.centerCoords,
      zoom: this.zoomLevel,
      zoomControl: true
    });

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.updateBaseTile();
    this.renderMarkers();

    // Trigger resize recalculation
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  setTileLayer(layer: 'standard' | 'satellite'): void {
    this.currentLayer = layer;
    this.updateBaseTile();
  }

  resetView(): void {
    this.map?.setView(this.centerCoords, this.zoomLevel);
  }

  private updateBaseTile(): void {
    if (!this.map) return;

    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    if (this.currentLayer === 'satellite') {
      this.tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 18
      });
    } else {
      const isDark = this.themeService.isDark();
      const url = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      this.tileLayer = L.tileLayer(url, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20
      });
    }

    this.tileLayer.addTo(this.map);
  }

  private renderMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const devList = this.devices.length > 0 ? this.devices : this.defaultDevices;

    devList.forEach(dev => {
      // Check if this device has active anomalies
      const devAnomalies = this.anomalies.filter(a => a.mac === dev.mac && a.status === 'NEW');
      const hasCritical = devAnomalies.some(a => a.severity === 'HIGH') || dev.status === 'CRITICAL';
      const hasMedium = devAnomalies.some(a => a.severity === 'MEDIUM') || dev.status === 'WARNING';

      let markerColor = '#10b981'; // Normal / Green
      let statusLabel = 'Normal · Réseau Stable';
      let isPulsing = false;

      if (hasCritical) {
        markerColor = '#ef4444'; // Red / Critical
        statusLabel = 'Fuite Critique Détectée';
        isPulsing = true;
      } else if (hasMedium) {
        markerColor = '#f59e0b'; // Amber / Warning
        statusLabel = 'Suspicion de Fuite';
        isPulsing = true;
      }

      const pulseHtml = isPulsing ? `
        <circle cx="25" cy="25" r="16" fill="${markerColor}" opacity="0.4">
          <animate attributeName="r" values="12;24;12" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/>
        </circle>
      ` : '';

      const svgHtml = `
        <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
          ${pulseHtml}
          <circle cx="25" cy="25" r="10" fill="${markerColor}" stroke="#ffffff" stroke-width="2.5" />
          <text x="25" y="29" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">💧</text>
        </svg>
      `;

      const customIcon = L.divIcon({
        html: svgHtml,
        className: 'droppy-leaflet-marker',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });

      const marker = L.marker(dev.coordinates, { icon: customIcon });

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; padding: 6px; min-width: 200px; color: #1e293b;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <strong style="font-size: 13px; color: #0f172a;">${dev.name}</strong>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 999px; background: ${markerColor}20; color: ${markerColor}; font-weight: 700;">
              ${hasCritical ? 'CRITIQUE' : hasMedium ? 'ALERTE' : 'OK'}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">MAC: <code>${dev.mac}</code></div>
          <div style="font-size: 12px; margin-bottom: 3px;">Pression : <strong>${dev.pressure} bar</strong></div>
          <div style="font-size: 12px; margin-bottom: 3px;">Débit actuel : <strong>${dev.currentFlow} L/min</strong></div>
          <div style="font-size: 12px; margin-bottom: 6px;">Batterie : <strong>${dev.battery}%</strong> · Signal : <strong>${dev.rssi} dBm</strong></div>
          <div style="font-size: 11px; color: ${markerColor}; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            ${statusLabel}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      this.markersLayer!.addLayer(marker);
    });
  }
}
