import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { APP_CONFIG } from '../config/app-config';

export interface AuditLogEntry {
  _id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  module: string;
  entityType?: string;
  entityName?: string;
  entityId?: string;
  details?: string;
  severity?: 'info' | 'success' | 'warning' | 'danger';
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private http = inject(HttpClient);
  private apiUrl = `${APP_CONFIG.apiBaseUrl}/audit-logs`;

  getAuditLogs(filters: Record<string, string> = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'All') {
        params = params.set(key, value);
      }
    });

    return this.http.get<AuditLogEntry[]>(this.apiUrl, {
      headers: this.getHeaders(),
      params
    });
  }

  recordAuditEvent(payload: {
    action: string;
    module: string;
    entityType?: string;
    entityName?: string;
    entityId?: string;
    details?: string;
    severity?: string;
  }) {
    return this.http.post(`${this.apiUrl}`, payload, {
      headers: this.getHeaders()
    });
  }

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
