import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { DroppyAnomaly } from '../../services/anomaly.service';

@Component({
  selector: 'app-leak-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div id="map" class="map-container glass-card"></div>`,
  styles: [`
    .map-container {
      height: 380px;
      width: 100%;
      border-radius: var(--radius-lg);
      z-index: 1;
    }
  `]
})
export class LeakMapComponent implements OnInit, OnDestroy, OnChanges {
  @Input() anomalies: DroppyAnomaly[] = [];

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Tunis simulated water utility site coordinates
  private lat = 36.8065;
  private lon = 10.1815;
  private mac = '1C:69:20:35:73:C4';

  ngOnInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anomalies'] && !changes['anomalies'].firstChange) {
      this.updateMarkerColor();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Initialize map
    this.map = L.map('map', {
      center: [this.lat, this.lon],
      zoom: 13,
      zoomControl: true
    });

    // Add standard OpenStreetMap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(this.map);

    this.updateMarkerColor();
  }

  private updateMarkerColor(): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.remove();
    }

    // Determine status color based on unresolved anomalies
    const unresolved = this.anomalies.filter(a => a.mac === this.mac && a.status === 'NEW');
    const isCritical = unresolved.some(a => a.severity === 'HIGH');
    const isMedium = unresolved.some(a => a.severity === 'MEDIUM');

    let markerColor = '#68d391'; // Green (Normal)
    let statusText = 'Normal';
    if (isCritical) {
      markerColor = '#fc8181'; // Red (Critical Alert)
      statusText = 'Fuite Critique Détectée';
    } else if (isMedium) {
      markerColor = '#f6ad55'; // Orange (Suspicion)
      statusText = 'Suspicion de Fuite';
    }

    // Leaflet custom SVG marker
    const iconSvg = `
      <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="25" fill="${markerColor}" opacity="0.4">
          <animate attributeName="r" values="20;40;20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="50" cy="50" r="12" fill="${markerColor}" stroke="#ffffff" stroke-width="3"/>
      </svg>
    `;

    const customIcon = L.divIcon({
      html: iconSvg,
      className: 'custom-leaflet-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.marker = L.marker([this.lat, this.lon], { icon: customIcon }).addTo(this.map);

    // Bind elegant dark popups
    const popupContent = `
      <div style="font-family: 'Inter', sans-serif; color: #2d3748; padding: 4px;">
        <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">Compteur : ${this.mac}</h4>
        <p style="margin: 0 0 4px 0; font-size: 12px;">Statut : <strong style="color: ${markerColor}">${statusText}</strong></p>
        <p style="margin: 0; font-size: 11px; color: #718096;">Zone : Tunis Centre</p>
      </div>
    `;
    this.marker.bindPopup(popupContent);
  }
}
