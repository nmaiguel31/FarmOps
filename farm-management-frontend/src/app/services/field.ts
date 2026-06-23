import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class Field {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/fields`;

  private farmsUrl = `${APP_CONFIG.apiBaseUrl}/farms`;

  private cropsUrl = `${APP_CONFIG.apiBaseUrl}/crops`;

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getFields() {
    return this.http.get(
      this.apiUrl,
      { headers: this.getHeaders() }
    );
  }

  getField(id: string) {
    return this.http.get(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createField(fieldData: any) {
    return this.http.post(
      this.apiUrl,
      fieldData,
      { headers: this.getHeaders() }
    );
  }

  updateField(id: string, fieldData: any) {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      fieldData,
      { headers: this.getHeaders() }
    );
  }

  deleteField(id: string) {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers: this.getHeaders() }
    );
  }

  getFarms() {
    return this.http.get(
      this.farmsUrl,
      { headers: this.getHeaders() }
    );
  }

  getCrops() {
    return this.http.get(
      this.cropsUrl,
      { headers: this.getHeaders() }
    );
  }

}
