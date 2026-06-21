import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Crop {

  private http = inject(HttpClient);

  private apiBase =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000/api'
      : 'https://farmops-api-nmaiguel.azurewebsites.net/api';

  private apiUrl = `${this.apiBase}/crops`;

  private farmsUrl = `${this.apiBase}/farms`;

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
