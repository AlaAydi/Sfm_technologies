import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="theme-toggle-btn" 
      (click)="themeService.toggleTheme()" 
      [title]="themeService.isDark() ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'"
      aria-label="Basculer le thème">
      <div class="toggle-track" [class.is-light]="!themeService.isDark()">
        <span class="toggle-icon sun">☀️</span>
        <span class="toggle-icon moon">🌙</span>
        <div class="toggle-thumb"></div>
      </div>
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      background: transparent;
      border: none;
      padding: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      outline: none;
    }

    .toggle-track {
      position: relative;
      width: 58px;
      height: 30px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 6px;
      transition: background 0.3s ease, border-color 0.3s ease;
    }

    :host-context([data-theme="light"]) .toggle-track,
    :host-context(body.light-theme) .toggle-track {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }

    .toggle-icon {
      font-size: 13px;
      line-height: 1;
      z-index: 1;
      user-select: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .toggle-thumb {
      position: absolute;
      left: 3px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--gradient-teal);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 2;
    }

    .toggle-track.is-light .toggle-thumb {
      transform: translateX(28px);
      background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
    }
  `]
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}
