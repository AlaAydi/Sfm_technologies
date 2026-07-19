import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DroppyAnomaly {
  id: number;
  mac: string;
  type: string;
  score: number;
  severity: string;
  startAt: string;
  endAt: string;
  status: 'NEW' | 'CONFIRMED' | 'FALSE_POSITIVE';
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface ForecastItem {
  date: string;
  predicted_consumption: number;
  lower_bound: number;
  upper_bound: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnomalyService {
  private apiBaseUrl = 'http://localhost:8082/api/v1/droppy/anomalies';

  constructor(private http: HttpClient) {}

  getAnomalies(filters: {
    mac?: string;
    status?: string;
    severity?: string;
    start?: string;
    end?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: string;
  }): Observable<PageResponse<DroppyAnomaly>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<PageResponse<DroppyAnomaly>>(this.apiBaseUrl, { params });
  }

  updateStatus(id: number, status: 'CONFIRMED' | 'FALSE_POSITIVE'): Observable<DroppyAnomaly> {
    return this.http.post<DroppyAnomaly>(`${this.apiBaseUrl}/${id}/status`, null, {
      params: new HttpParams().set('status', status)
    });
  }

  triggerAnalysis(mac: string): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/analyze/${mac}`, null);
  }

  getForecast(mac: string, days: number = 7): Observable<ForecastItem[]> {
    // Call FastAPI directly for the forecast (as core-service forwards to Python)
    return this.http.get<ForecastItem[]>(`http://localhost:8082/api/v1/droppy/anomalies/forecast/${mac}`, {
      params: new HttpParams().set('days', days.toString())
    });
  }
}
