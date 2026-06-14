import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Mfa {

  private http = inject(HttpClient);

  private apiUrl = 'https://farmops-api-nmaiguel.azurewebsites.net/api/mfa';

  setupMFA() {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get(
      `${this.apiUrl}/setup`,
      { headers }
    );

  }

  verifyMFA(tokenCode: string) {

    const token = localStorage.getItem('token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.post(
      `${this.apiUrl}/verify`,
      {
        token: tokenCode
      },
      {
        headers
      }
    );

  }

}