import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { APP_CONFIG } from '../config/app-config';
import { canAccessRoute, normalizeRole, ROLE_LABELS } from '../shared/rbac/roles';

export interface FarmOpsUser {
  id?: string;
  email: string;
  fullName?: string;
  role?: string;
  accountStatus?: string;
  memberSince?: string;
  lastLogin?: string;
  mfaEnabled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private http = inject(HttpClient);

  private apiUrl = `${APP_CONFIG.apiBaseUrl}/auth`;

  private userSubject = new BehaviorSubject<FarmOpsUser | null>(this.readStoredUser());

  readonly user$ = this.userSubject.asObservable();

  private sessionHydration$?: Observable<FarmOpsUser | null>;

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: FarmOpsUser }>(`${this.apiUrl}/login`, {
      email,
      password
    }).pipe(
      tap((response) => {
        if (response?.user) {
          this.setCurrentUser(response.user);
        }
      })
    );
  }

  getProfile() {
    return this.http.get<FarmOpsUser>(
      `${this.apiUrl}/profile`,
      { headers: this.getHeaders() }
    ).pipe(
      tap((user) => this.setCurrentUser(user))
    );
  }

  ensureSessionReady() {
    const currentUser =
      this.getCurrentUser();

    if (currentUser) {
      this.setCurrentUser(currentUser);
      return of(currentUser);
    }

    const token =
      localStorage.getItem('token');

    if (!token) {
      this.setCurrentUser(null);
      return of(null);
    }

    if (!this.sessionHydration$) {
      this.sessionHydration$ =
        this.getProfile().pipe(
          catchError(() => {
            this.setCurrentUser(null);
            return of(null);
          }),
          tap(() => {
            this.sessionHydration$ = undefined;
          }),
          shareReplay(1)
        );
    }

    return this.sessionHydration$;
  }

  updateProfile(fullName: string) {
    return this.http.patch<FarmOpsUser>(
      `${this.apiUrl}/profile`,
      { fullName },
      { headers: this.getHeaders() }
    ).pipe(
      tap((user) => this.setCurrentUser(user))
    );
  }

  getCurrentUser() {
    return this.userSubject.value || this.readStoredUser();
  }

  setCurrentUser(user: FarmOpsUser | null) {
    if (!user) {
      localStorage.removeItem('farmopsUser');
      this.userSubject.next(null);
      return;
    }

    localStorage.setItem('farmopsUser', JSON.stringify(user));
    this.userSubject.next(user);
  }

  getDisplayName() {
    const user = this.getCurrentUser();
    return user?.fullName?.trim() || '';
  }

  getCurrentRole() {
    return normalizeRole(this.getCurrentUser()?.role);
  }

  getCurrentRoleLabel() {
    return ROLE_LABELS[this.getCurrentRole()];
  }

  canAccess(route: string) {
    return canAccessRoute(this.getCurrentRole(), route);
  }

  getInitials() {
    const user = this.getCurrentUser();
    const source = user?.fullName?.trim() || user?.email || '';
    const parts = source
      .replace(/@.*$/, '')
      .split(/\s|\.|_/)
      .filter(Boolean);

    return (parts[0]?.[0] || 'F') + (parts[1]?.[0] || parts[0]?.[1] || 'O');
  }

  private getHeaders() {
    const token = localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private readStoredUser(): FarmOpsUser | null {
    const raw = localStorage.getItem('farmopsUser');

    if (!raw) {
      return null;
    }

    try {
      const user = JSON.parse(raw);
      return {
        ...user,
        role: normalizeRole(user?.role)
      };
    } catch {
      localStorage.removeItem('farmopsUser');
      return null;
    }
  }

}
