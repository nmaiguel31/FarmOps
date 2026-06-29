import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class OperationSignal {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/operation-signals`;

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getSignals(filters: Record<string, string> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        params = params.set(key, value);
      }
    });

    return this.http.get(
      this.apiUrl,
      {
        headers: this.getHeaders(),
        params
      }
    );
  }

  getActiveSignals() {
    return this.http.get(
      `${this.apiUrl}/active`,
      { headers: this.getHeaders() }
    );
  }

  createSignal(signalData: any) {
    return this.http.post(
      this.apiUrl,
      signalData,
      { headers: this.getHeaders() }
    );
  }

  generateSignals() {
    return this.http.post(
      `${this.apiUrl}/generate`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateAllSignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/all`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateWeatherSignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/weather`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateNDVISignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/ndvi`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateFinancialSignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/financial`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateLifecycleSignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/lifecycle`,
      {},
      { headers: this.getHeaders() }
    );
  }

  evaluateFieldSignals() {
    return this.http.post(
      `${this.apiUrl}/evaluate/fields`,
      {},
      { headers: this.getHeaders() }
    );
  }

  resolveSignal(id: string) {
    return this.http.patch(
      `${this.apiUrl}/${id}/resolve`,
      {},
      { headers: this.getHeaders() }
    );
  }

  deleteSignal(id: string) {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

}
