import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'leaks',
    pathMatch: 'full'
  },
  {
    path: 'leaks',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: '**',
    redirectTo: 'leaks'
  }
];
