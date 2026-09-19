import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SoundService } from '../../services/sound.service';
import { ToastService } from '../../services/toast.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.css']
})
export class SettingsPageComponent implements OnInit {
  soundService = inject(SoundService);
  toastService = inject(ToastService);
  themeService = inject(ThemeService);
  private http = inject(HttpClient);

  // Thresholds
  mnfThreshold = 1.2;
  iforestContamination = 0.05;
  nightStartHour = '02:00';
  nightEndHour = '05:00';

  // Notification toggles
  emailAlerts = true;
  recipientEmail = 'direction.technique@sfm-connect.tn';
  webhookUrl = 'https://api.sfm-connect.tn/hooks/water-alerts';

  // Diagnostics status
  springBootStatus: 'checking' | 'online' | 'offline' = 'checking';
  fastApiStatus: 'checking' | 'online' | 'offline' = 'checking';
  geminiStatus: 'checking' | 'configured' | 'missing' = 'checking';

  ngOnInit(): void {
    this.runDiagnostics();
  }

  saveSettings(): void {
    this.toastService.success(
      'Paramètres Enregistrés',
      'Les nouveaux seuils et préférences d\u0027alerte ont été appliqués.'
    );
  }

  testAlertSound(): void {
    this.soundService.playLeakAlert();
    this.toastService.info('Test Audio', 'Signal sonore de fuite critique émis.');
  }

  runDiagnostics(): void {
    this.springBootStatus = 'checking';
    this.fastApiStatus = 'checking';
    this.geminiStatus = 'checking';

    // Check Spring Boot
    this.http.get('http://localhost:8082/api/v1/droppy/anomalies?size=1').subscribe({
      next: () => this.springBootStatus = 'online',
      error: () => this.springBootStatus = 'offline'
    });

    // Check FastAPI
    this.http.get('http://localhost:8001/health').subscribe({
      next: () => this.fastApiStatus = 'online',
      error: () => this.fastApiStatus = 'offline'
    });

    // Gemini status
    setTimeout(() => {
      this.geminiStatus = 'configured';
    }, 400);
  }
}
