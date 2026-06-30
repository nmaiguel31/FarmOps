import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class Crop {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/crops`;

  private farmsUrl = `${APP_CONFIG.apiBaseUrl}/farms`;
  private fieldsUrl = `${APP_CONFIG.apiBaseUrl}/fields`;

  getFarms() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      this.farmsUrl,
      { headers }
    );
  } 

  getCrops() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      this.apiUrl,
      { headers }
    );
  }

  getFields() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      this.fieldsUrl,
      { headers }
    );
  }

  createCrop(cropData: any) {

  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.post(
    this.apiUrl,
    cropData,
    { headers }
  );

}

deleteCrop(id: string) {

  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.delete(
    `${this.apiUrl}/${id}`,
    { headers }
  );

}

updateCrop(id: string, cropData: any) {

  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put(
    `${this.apiUrl}/${id}`,
    cropData,
    { headers }
  );

}

}
