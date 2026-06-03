import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Farm {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/farms';

  getFarms() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      this.apiUrl,
      { headers }
    );
  }
  createFarm(farmData: any) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(
      this.apiUrl,
      farmData,
      { headers }
    );

  }
  deleteFarm(id: string) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers }
    );

  }
  updateFarm(id: string, farmData: any) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.put(
      `${this.apiUrl}/${id}`,
      farmData,
      { headers }
    );

}
}

