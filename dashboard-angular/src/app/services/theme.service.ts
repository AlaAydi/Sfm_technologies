import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'droppy_theme_preference';
  
  // Default to dark theme (Droppy signature look)
  theme = signal<AppTheme>(this.getInitialTheme());

  constructor() {
    // Synchronize document attributes whenever theme changes
    effect(() => {
      const current = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', current);
        if (current === 'light') {
          document.body.classList.add('light-theme');
          document.body.classList.remove('dark-theme');
        } else {
          document.body.classList.add('dark-theme');
          document.body.classList.remove('light-theme');
        }
        try {
          localStorage.setItem(this.THEME_KEY, current);
        } catch {
          // ignore storage errors in restricted envs
        }
      }
    });
  }

  toggleTheme(): void {
    this.theme.update(t => t === 'dark' ? 'light' : 'dark');
  }

  setTheme(newTheme: AppTheme): void {
    this.theme.set(newTheme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getInitialTheme(): AppTheme {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
        if (saved === 'dark' || saved === 'light') {
          return saved;
        }
      } catch {
        // ignore storage error
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  }
}
