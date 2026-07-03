import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  LucideBadgeDollarSign,
  LucideBell,
  LucideCheckCircle2,
  LucideFileText,
  LucideLeaf,
  LucideLogOut,
  LucideMail,
  LucideMap,
  LucideSave,
  LucideShieldCheck,
  LucideSprout,
} from '@lucide/angular';

import { clearAuthSession } from '../../guards/auth-guard';
import { Auth, FarmOpsUser } from '../../services/auth';
import { Crop } from '../../services/crop';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { FinancialRecord } from '../../services/financial-record';
import { OperationSignal } from '../../services/operation-signal';
import {
  getCurrentCrops,
  getCurrentFields,
  getCurrentRecords,
  getCurrentFarms,
  getCurrentSignals,
  isCurrentRecord
} from '../../shared/current-data-scope';
import { ToastService } from '../../shared/toast/toast.service';
import { ROLE_LABELS, normalizeRole } from '../../shared/rbac/roles';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideBadgeDollarSign,
    LucideBell,
    LucideCheckCircle2,
    LucideFileText,
    LucideLeaf,
    LucideLogOut,
    LucideMail,
    LucideMap,
    LucideSave,
    LucideShieldCheck,
    LucideSprout
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  user: FarmOpsUser | null = null;
  fullName = '';
  profileLoading = true;
  statsLoading = false;
  saving = false;
  loadError = '';

  accountStats = this.getEmptyAccountStats();

  private authService = inject(Auth);
  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private signalService = inject(OperationSignal);
  private router = inject(Router);
  private toast = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    const cachedUser = this.authService.getCurrentUser();

    if (cachedUser) {
      this.applyUser(cachedUser);
      this.profileLoading = false;
    }

    this.loadProfile();
  }

  get initials() {
    return this.authService.getInitials().toUpperCase();
  }

  get accountStatus() {
    return this.user?.accountStatus || 'Active';
  }

  get mfaStatus() {
    return this.user?.mfaEnabled ? 'Enabled' : 'Disabled';
  }

  get roleLabel() {
    return ROLE_LABELS[normalizeRole(this.user?.role)];
  }

  get memberSince() {
    return this.formatDate(this.user?.memberSince);
  }

  get lastLogin() {
    return this.formatDate(this.user?.lastLogin);
  }

  loadProfile() {
    this.profileLoading = !this.user;
    this.loadError = '';

    this.authService.getProfile().pipe(
      finalize(() => {
        this.loadStats();
      })
    ).subscribe({
      next: (user) => {
        this.applyUser(user);
        this.profileLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.loadError = 'Unable to load your profile right now.';
        this.profileLoading = false;
      }
    });
  }

  loadStats() {
    this.statsLoading = true;

    forkJoin({
      farms: this.authService.canAccess('farms') ? this.farmService.getFarms().pipe(catchError(error => this.handleStatsRequestError(error))) : of([]),
      fields: this.authService.canAccess('farms') ? this.fieldService.getFields().pipe(catchError(error => this.handleStatsRequestError(error))) : of([]),
      crops: this.authService.canAccess('crops') || this.authService.canAccess('farms') ? this.cropService.getCrops().pipe(catchError(error => this.handleStatsRequestError(error))) : of([]),
      records: this.authService.canAccess('financial-records') ? this.financialService.getRecords().pipe(catchError(error => this.handleStatsRequestError(error))) : of([]),
      signals: this.authService.canAccess('operations-center') ? this.signalService.getSignals().pipe(catchError(error => this.handleStatsRequestError(error))) : of([])
    }).pipe(
      finalize(() => {
        this.statsLoading = false;
      })
    ).subscribe({
      next: (data: any) => {
        try {
          const farms = getCurrentFarms(this.normalizeList(data.farms));
          const fields = getCurrentFields(farms, this.normalizeList(data.fields));
          const records =
            !this.authService.canAccess('farms') && this.authService.canAccess('financial-records')
              ? this.normalizeList(data.records).filter(isCurrentRecord)
              : getCurrentRecords(farms, this.normalizeList(data.records));
          const crops = getCurrentCrops(farms, fields, this.normalizeList(data.crops), records);
          const signals = getCurrentSignals(farms, fields, this.normalizeList(data.signals));

          this.accountStats = this.buildAccountStats({
            farmsManaged: farms.length,
            fieldsManaged: fields.length,
            cropsRegistered: crops.length,
            financialRecords: records.length,
            reportsGenerated: 0,
            alertsResolved: signals.filter((signal: any) => signal.status === 'Resolved').length
          });
        } catch (error) {
          console.error(error);
          this.accountStats = this.getEmptyAccountStats();
        }
      },
      error: (error) => {
        console.error(error);
        this.accountStats = this.getEmptyAccountStats();
      }
    }).add(() => {
      this.cdr.detectChanges();
    });
  }

  updateProfile() {
    if (this.saving) {
      return;
    }

    this.saving = true;

    this.authService.updateProfile(this.fullName).subscribe({
      next: (user) => {
        this.applyUser(user);
        this.saving = false;
        this.toast.success('Profile updated', 'Your name was saved.');
      },
      error: (error) => {
        this.saving = false;
        this.toast.error('Could not update profile', error?.error?.message || 'Please try again.');
      }
    });
  }

  logout() {
    clearAuthSession();
    this.authService.setCurrentUser(null);
    this.router.navigate(['/login']);
  }

  trackByValue(_index: number, item: any) {
    return item;
  }

  trackByStat(_index: number, stat: any) {
    return stat?.label || stat?.icon || _index;
  }

  private formatDate(value?: string) {
    if (!value) {
      return 'Not available';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  private applyUser(user: FarmOpsUser) {
    this.user = user;
    this.fullName = user.fullName || '';
  }

  private handleStatsRequestError(error: any) {
    console.error(error);
    return of([]);
  }

  private normalizeList(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }

    const collectionKeys = [
      'farms',
      'fields',
      'crops',
      'records',
      'financialRecords',
      'signals',
      'operationSignals',
      'alerts'
    ];

    for (const key of collectionKeys) {
      if (Array.isArray(value?.[key])) {
        return value[key];
      }
    }

    if (Array.isArray(value?.data)) {
      return value.data;
    }

    if (Array.isArray(value?.items)) {
      return value.items;
    }

    if (Array.isArray(value?.results)) {
      return value.results;
    }

    return [];
  }

  private getEmptyAccountStats() {
    return this.buildAccountStats({
      farmsManaged: 0,
      fieldsManaged: 0,
      cropsRegistered: 0,
      financialRecords: 0,
      reportsGenerated: 0,
      alertsResolved: 0
    });
  }

  private buildAccountStats(values: {
    farmsManaged: number;
    fieldsManaged: number;
    cropsRegistered: number;
    financialRecords: number;
    reportsGenerated: number;
    alertsResolved: number;
  }) {
    return [
      {
        label: 'Farms Managed',
        value: values.farmsManaged,
        icon: 'map'
      },
      {
        label: 'Fields Managed',
        value: values.fieldsManaged,
        icon: 'leaf'
      },
      {
        label: 'Crops Registered',
        value: values.cropsRegistered,
        icon: 'sprout'
      },
      {
        label: 'Financial Records',
        value: values.financialRecords,
        icon: 'wallet'
      },
      {
        label: 'Reports Generated',
        value: values.reportsGenerated,
        icon: 'file-text'
      },
      {
        label: 'Alerts Resolved',
        value: values.alertsResolved,
        icon: 'check-circle'
      }
    ];
  }
}
