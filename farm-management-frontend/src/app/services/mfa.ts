import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class Mfa {

  private http = inject(HttpClient);

  private apiUrl = 'https://farmops-api-nmaiguel.azurewebsites.net/api/mfa';

  setupMFA() {

    return this.http.get(
      `${this.apiUrl}/setup`
    );

  }

  verifyMFA(token: string) {

    return this.http.post(
      `${this.apiUrl}/verify`,
      { token }
    );

  }

}