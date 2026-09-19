import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'apercu'
  },
  {
    path: 'apercu',
    loadComponent: () => import('./pages/overview/overview.component').then(m => m.OverviewComponent)
  },
  {
    path: 'anomalies',
    loadComponent: () => import('./pages/anomalies/anomalies.component').then(m => m.AnomaliesComponent)
  },
  {
    path: 'carte',
    loadComponent: () => import('./pages/map/map-page.component').then(m => m.MapPageComponent)
  },
  {
    path: 'previsions',
    loadComponent: () => import('./pages/forecast/forecast.component').then(m => m.ForecastComponent)
  },
  {
    path: 'capteurs',
    loadComponent: () => import('./pages/sensors/sensors-page.component').then(m => m.SensorsPageComponent)
  },
  {
    path: 'rapports',
    loadComponent: () => import('./pages/reports/reports-page.component').then(m => m.ReportsPageComponent)
  },
  {
    path: 'parametres',
    loadComponent: () => import('./pages/settings/settings-page.component').then(m => m.SettingsPageComponent)
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat-page.component').then(m => m.ChatPageComponent)
  },
  {
    path: '**',
    redirectTo: 'apercu'
  }
];