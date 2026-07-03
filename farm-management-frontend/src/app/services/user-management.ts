import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

export type ManagedUserStatus = 'active' | 'suspended';
export type ManagedUserRole =
  'administrator' |
  'farm_manager' |
  'accountant' |
  'field_operator';

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  createdAt?: string;
  lastLogin?: string;
  mfaEnabled?: boolean;
}

export interface CreateManagedUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: ManagedUserRole;
}

export interface UpdateManagedUserPayload {
  fullName: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${APP_CONFIG.apiBaseUrl}/users`;

  getUsers() {
    return this.http.get<ManagedUser[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  createUser(payload: CreateManagedUserPayload) {
    return this.http.post<ManagedUser>(this.apiUrl, payload, {
      headers: this.getHeaders()
    });
  }

  updateUser(id: string, payload: UpdateManagedUserPayload) {
    return this.http.patch<ManagedUser>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    });
  }

  resetPassword(id: string, password: string) {
    return this.http.patch<ManagedUser>(
      `${this.apiUrl}/${id}/reset-password`,
      { password },
      { headers: this.getHeaders() }
    );
  }

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
