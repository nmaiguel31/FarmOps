import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Crop {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/crops';

  getFarms() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      'http://localhost:5000/api/farms',
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