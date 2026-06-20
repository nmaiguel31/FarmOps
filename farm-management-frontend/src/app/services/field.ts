import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Field {

  private http = inject(HttpClient);

  private apiBase =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://farmops-api-nmaiguel.azurewebsites.net/api';

  private apiUrl = `${this.apiBase}/fields`;

  private farmsUrl = `${this.apiBase}/farms`;

  private cropsUrl = `${this.apiBase}/crops`;

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
