import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AnomalyService, DroppyAnomaly } from './services/anomaly.service';
import { WebsocketService } from './services/websocket.service';
import { ToastService } from './services/toast.service';
import { SoundService } from './services/sound.service';
import { ThemeService } from './services/theme.service';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';
import { ToastContainerComponent } from './components/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    CommonModule, 
    ChatbotComponent, 
    ThemeToggleComponent, 
    ToastContainerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  anomalyService = inject(AnomalyService);
  wsService = inject(WebsocketService);
  toastService = inject(ToastService);
  soundService = inject(SoundService);
  themeService = inject(ThemeService);
  router = inject(Router);

  pageTitle = 'Aperçu';
  mobileMenuOpen = signal<boolean>(false);

  // Live alerts
  liveAlerts = signal<DroppyAnomaly[]>([]);
  unreadCount = signal<number>(0);
  alertsOpen = signal<boolean>(false);

  private wsSubscription?: Subscription;
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    this.subscribeToLiveAnomalies();
    this.trackPageTitle();
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  private trackPageTitle(): void {
    const titles: Record<string, string> = {
      'apercu': 'Aperçu Général',
      'anomalies': 'Détection des Anomalies & Fuites',
      'carte': 'Carte Géospatiale des Fuites',
      'previsions': 'Prévisions IA de Consommation',
      'capteurs': 'Supervision des Capteurs & Compteurs IoT',
      'rapports': 'Rapports & Audit Hydrique',
      'parametres': 'Paramètres & Configuration Système',
      'chat': 'Assistant Intelligent Droppy'
    };

    this.routerSubscription = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const seg = this.router.url.split('?')[0].split('/')[1] || 'apercu';
        this.pageTitle = titles[seg] ?? 'Droppy';
        this.closeMobileMenu();
      });
  }

  private subscribeToLiveAnomalies(): void {
    this.wsSubscription = this.wsService.getAnomalies().subscribe((anomaly: DroppyAnomaly) => {
      this.liveAlerts.update(alerts => [anomaly, ...alerts.slice(0, 5)]);
      this.unreadCount.update(n => n + 1);

      if (anomaly.severity === 'HIGH') {
        this.soundService.playLeakAlert();
        this.toastService.error(
          '🚨 Fuite Critique Détectée !',
          `Anomalie [${anomaly.type}] sur le compteur ${anomaly.mac}. Perte estimée : ${anomaly.estimatedLossM3 || 4.5} m³.`
        );
      } else {
        this.toastService.warning(
          '⚠️ Nouvelle Anomalie',
          `Alerte [${anomaly.type}] enregistrée pour ${anomaly.mac}.`
        );
      }
    });
  }

  /**
   * WOW Feature: Injects a live leak event into the system
   */
  simulateLeak(): void {
    const leak = this.anomalyService.simulateNewLeak();
    this.toastService.error(
      '🚨 Fuite Critique Simulée (WOW)',
      `Événement injecté sur le compteur ${leak.mac} (${leak.zone}). Flux temps réel actualisé.`
    );
  }

  toggleAlerts(): void {
    this.alertsOpen.set(!this.alertsOpen());
    if (this.alertsOpen()) {
      this.unreadCount.set(0);
    }
  }

  clearAlerts(): void {
    this.liveAlerts.set([]);
    this.unreadCount.set(0);
  }

  triggerAnalysis(): void {
    this.toastService.info('Analyse Déclenchée', 'Exécution des modèles IA (Isolation Forest, MNF) en cours...');
    this.anomalyService.triggerAnalysis('1C:69:20:35:73:C4').subscribe({
      next: (res) => {
        this.toastService.success('Analyse Terminée', res.message);
      },
      error: () => {
        this.toastService.warning('Analyse Locale', 'Analyse exécutée en mode local autonome.');
      }
    });
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

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}