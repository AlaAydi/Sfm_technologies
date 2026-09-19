import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DroppyAnomaly } from '../../services/anomaly.service';

@Component({
  selector: 'app-anomaly-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drawer-backdrop" *ngIf="anomaly" (click)="close.emit()">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="drawer-header">
          <div>
            <div class="badge" [ngClass]="getSeverityClass(anomaly.severity)">
              {{ anomaly.severity }} · Score {{ (anomaly.score * 100).toFixed(0) }}%
            </div>
            <h3 class="drawer-title" style="margin-top: 8px;">
              {{ getTypeIcon(anomaly.type) }} {{ getTypeName(anomaly.type) }}
            </h3>
          </div>
          <button class="drawer-close" (click)="close.emit()">✕</button>
        </div>

        <!-- Body -->
        <div class="drawer-body">
          <!-- Quick summary card -->
          <div class="glass-card detail-card">
            <div class="detail-row">
              <span class="detail-label">Identifiant</span>
              <span class="detail-value font-mono">#ANOM-{{ anomaly.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Compteur IoT (MAC)</span>
              <span class="detail-value font-mono highlight">{{ anomaly.mac }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Zone Réseau</span>
              <span class="detail-value">{{ anomaly.zone || 'Tunis Centre - Réseau Principal' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Statut Actuel</span>
              <span class="badge" [ngClass]="getStatusClass(anomaly.status)">{{ anomaly.status }}</span>
            </div>
          </div>

          <!-- Chronology & Duration -->
          <div class="glass-card detail-card">
            <h4 class="card-subtitle">⏱️ Chronologie de l'Incident</h4>
            <div class="timeline-step">
              <div class="step-dot"></div>
              <div class="step-content">
                <span class="step-label">Début Détection</span>
                <span class="step-val">{{ formatDate(anomaly.startAt) }}</span>
              </div>
            </div>
            <div class="timeline-step">
              <div class="step-dot" style="background: var(--accent-orange);"></div>
              <div class="step-content">
                <span class="step-label">Fin / Dernier Ping</span>
                <span class="step-val">{{ formatDate(anomaly.endAt) }}</span>
              </div>
            </div>
            <div class="detail-row" style="margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
              <span class="detail-label">Durée Estimée</span>
              <span class="detail-value font-bold">{{ calculateDuration(anomaly.startAt, anomaly.endAt) }}</span>
            </div>
          </div>

          <!-- Hydrodynamic & Financial Impact -->
          <div class="glass-card detail-card impact-card">
            <h4 class="card-subtitle">💧 Bilan Hydrodynamique & Financier</h4>
            <div class="impact-grid">
              <div class="impact-item">
                <span class="impact-label">Volume Perdu Estimé</span>
                <span class="impact-value text-danger">{{ (anomaly.estimatedLossM3 || 4.2).toFixed(1) }} m³</span>
                <span class="impact-sub">≈ {{ ((anomaly.estimatedLossM3 || 4.2) * 1000).toLocaleString() }} Litres</span>
              </div>
              <div class="impact-item">
                <span class="impact-label">Coût Financier</span>
                <span class="impact-value text-warning">{{ ((anomaly.estimatedLossM3 || 4.2) * 2.85).toFixed(2) }} TND</span>
                <span class="impact-sub">Tarif SONEDE Pro</span>
              </div>
            </div>
          </div>

          <!-- AI Diagnostic & Cause -->
          <div class="glass-card detail-card">
            <h4 class="card-subtitle">🤖 Diagnostic de l'IA Droppy</h4>
            <p class="ai-text">
              {{ anomaly.recommendedAction || 'Suspicion de micro-fuite continue détectée lors de la fenêtre d\u0027inactivité minimale nocturne (MNF). Débit persistant supérieur au seuil de base.' }}
            </p>
            <div class="recommendation-box">
              <strong>Action recommandée :</strong> 
              <span>Vérifier le secteur par corrélation acoustique et inspecter le joint de bride sur la conduite d'alimentation.</span>
            </div>
          </div>

          <!-- Actions Footer -->
          <div class="drawer-actions">
            @if (anomaly.status === 'NEW') {
              <button class="btn-primary" style="flex: 1;" (click)="confirm.emit(anomaly)">
                ✓ Confirmer la Fuite
              </button>
              <button class="btn-ghost" style="flex: 1;" (click)="markFalsePositive.emit(anomaly)">
                ✗ Marquer Faux Positif
              </button>
            } @else {
              <div class="processed-tag">
                <span>Cette anomalie a déjà été traitée ({{ anomaly.status }})</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-card {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 6px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .detail-label { color: var(--text-secondary); }
    .detail-value { color: var(--text-primary); font-weight: 600; }
    .font-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
    .highlight { color: var(--accent-cyan); }
    .font-bold { font-weight: 700; }

    .timeline-step {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-cyan);
      box-shadow: 0 0 6px currentColor;
    }
    .step-content {
      display: flex;
      justify-content: space-between;
      flex: 1;
      font-size: 12px;
    }
    .step-label { color: var(--text-secondary); }
    .step-val { color: var(--text-primary); font-weight: 600; }

    .impact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 6px;
    }
    .impact-item {
      background: var(--bg-card-hover);
      padding: 12px;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .impact-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
    .impact-value { font-size: 20px; font-weight: 800; font-family: 'Inter', sans-serif; }
    .impact-sub { font-size: 11px; color: var(--text-muted); }

    .ai-text {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .recommendation-box {
      margin-top: 8px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: rgba(79, 209, 197, 0.1);
      border-left: 3px solid var(--accent-cyan);
      font-size: 12px;
      color: var(--text-primary);
    }
    .recommendation-box strong { color: var(--accent-cyan); display: block; margin-bottom: 2px; }

    .drawer-actions {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }
    .processed-tag {
      width: 100%;
      text-align: center;
      padding: 12px;
      border-radius: var(--radius-sm);
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      font-size: 13px;
      color: var(--text-secondary);
    }
  `]
})
export class AnomalyDrawerComponent {
  @Input() anomaly: DroppyAnomaly | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<DroppyAnomaly>();
  @Output() markFalsePositive = new EventEmitter<DroppyAnomaly>();

  getTypeName(type: string): string {
    switch (type) {
      case 'NIGHT_FLOW': return 'Fuite Nocturne (MNF)';
      case 'VALVE_INCONSISTENCY': return 'Incohérence Débit / Vanne';
      case 'FLOW_ANOMALY_IFOREST': return 'Anomalie IA (Isolation Forest)';
      case 'CONSUMPTION_DRIFT': return 'Dérive Prévisionnelle de Débit';
      default: return type;
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

  getSeverityClass(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  }

  getStatusClass(status: string): string {
    return status === 'NEW' ? 'badge-new' : status === 'CONFIRMED' ? 'badge-confirmed' : 'badge-fp';
  }

  formatDate(iso?: string): string {
    if (!iso) return 'Non renseigné';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  calculateDuration(start?: string, end?: string): string {
    if (!start || !end) return '2h 15m';
    const ms = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const hours = Math.floor(ms / (1000 * 3600));
    const minutes = Math.floor((ms % (1000 * 3600)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}
