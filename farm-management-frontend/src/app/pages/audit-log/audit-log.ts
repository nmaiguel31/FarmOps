import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideCalendar,
  LucideFilter,
  LucideSearch,
  LucideShieldCheck
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { AuditLogEntry, AuditLogService } from '../../services/audit-log';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import { ROLE_LABELS } from '../../shared/rbac/roles';

@Component({
  selector: 'app-audit-log',
  imports: [
    CommonModule,
    FormsModule,
    LucideCalendar,
    LucideFilter,
    LucideSearch,
    LucideShieldCheck,
    EmptyStateComponent
  ],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.css'
})
export class AuditLog implements OnInit {
  private auditLogService = inject(AuditLogService);

  logs: AuditLogEntry[] = [];
  filteredLogs: AuditLogEntry[] = [];
  loading = true;
  loadError = '';
  searchTerm = '';
  roleFilter = 'All';
  moduleFilter = 'All';
  actionFilter = 'All';
  severityFilter = 'All';
  startDate = '';
  endDate = '';
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.loading = true;
    this.loadError = '';

    this.auditLogService.getAuditLogs({
      user: this.searchTerm,
      role: this.roleFilter,
      module: this.moduleFilter,
      action: this.actionFilter,
      severity: this.severityFilter,
      startDate: this.startDate,
      endDate: this.endDate
    })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: logs => {
          this.logs = logs || [];
          this.filteredLogs = [...this.logs];
        },
        error: error => {
          this.logs = [];
          this.filteredLogs = [];
          this.loadError = error?.error?.message || 'Unable to load audit log entries.';
        }
      });
  }

  clearFilters() {
    this.searchTerm = '';
    this.roleFilter = 'All';
    this.moduleFilter = 'All';
    this.actionFilter = 'All';
    this.severityFilter = 'All';
    this.startDate = '';
    this.endDate = '';
    this.loadAuditLogs();
  }

  get moduleOptions() {
    return this.uniqueValues('module');
  }

  get actionOptions() {
    return this.uniqueValues('action');
  }

  private uniqueValues(key: 'module' | 'action') {
    return Array.from(new Set(this.logs.map(log => log[key]).filter(Boolean))).sort();
  }

  getRoleLabel(role?: string) {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role || 'System';
  }

  formatDate(value?: string) {
    if (!value) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  }

  trackById(index: number, item: AuditLogEntry) {
    return item?._id || `${item?.timestamp}-${index}`;
  }

  trackByValue(_index: number, item: any) {
    return item;
  }
}
