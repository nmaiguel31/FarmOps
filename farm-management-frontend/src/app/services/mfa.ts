import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class Mfa {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/mfa`;

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

  getStatus() {

  const token =
    localStorage.getItem('token');

  const headers =
    new HttpHeaders({
      Authorization:
        `Bearer ${token}`
    });

  return this.http.get(
    `${this.apiUrl}/status`,
    { headers }
  );

}

loginVerify(tokenCode: string) {

  const token =
    localStorage.getItem('token');

  const headers =
    new HttpHeaders({
      Authorization:
        `Bearer ${token}`
    });

  return this.http.post(
    `${this.apiUrl}/login-verify`,
    {
      token: tokenCode
    },
    {
      headers
    }
  );

}

disableMFA() {

  const token =
    localStorage.getItem('token');

  const headers =
    new HttpHeaders({
      Authorization:
        `Bearer ${token}`
    });

  return this.http.post(
    `${this.apiUrl}/disable`,
    {},
    {
      headers
    }
  );

}

}
