import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private http = inject(HttpClient);

  private apiUrl = 'https://farmops-api-nmaiguel.azurewebsites.net/api/auth';

  login(email: string, password: string) {
    return this.http.post(`${this.apiUrl}/login`, {
      email,
      password
    });
  }

}