import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class Zone {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/zones`;

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getZones() {
    return this.http.get(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getZonesByField(fieldId: string) {
    return this.http.get(
      `${this.apiUrl}?field=${fieldId}`,
      { headers: this.getHeaders() }
    );
  }

  getZone(id: string) {
    return this.http.get(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createZone(zoneData: any) {
    return this.http.post(
      this.apiUrl,
      zoneData,
      { headers: this.getHeaders() }
    );
  }

  updateZone(id: string, zoneData: any) {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      zoneData,
      { headers: this.getHeaders() }
    );
  }

  deleteZone(id: string) {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

}
