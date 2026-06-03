import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class FinancialRecord {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/api/financial-records';

  getRecords() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      this.apiUrl,
      { headers }
    );
  }
  createRecord(recordData: any) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(
      this.apiUrl,
      recordData,
      { headers }
    );

}
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

  deleteRecord(id: string) {

  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.delete(
    `${this.apiUrl}/${id}`,
    { headers }
  );

}

updateRecord(id: string, recordData: any) {

  const token = localStorage.getItem('token');

  const headers = new HttpHeaders({
    Authorization: `Bearer ${token}`
  });

  return this.http.put(
    `${this.apiUrl}/${id}`,
    recordData,
    { headers }
  );

}
  }