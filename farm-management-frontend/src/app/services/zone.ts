import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Zone {

  private http = inject(HttpClient);

  private apiBase =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://farmops-api-nmaiguel.azurewebsites.net/api';

  private apiUrl = `${this.apiBase}/zones`;

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
