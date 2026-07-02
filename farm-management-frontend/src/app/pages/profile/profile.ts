import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  LucideBadgeDollarSign,
  LucideBell,
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
  getCurrentSignals
} from '../../shared/current-data-scope';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideBadgeDollarSign,
    LucideBell,
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
  statsLoading = true;
  saving = false;
  loadError = '';

  stats = {
    farmsManaged: 0,
    fieldsManaged: 0,
    cropsRegistered: 0,
    financialRecords: 0,
    reportsGenerated: 'Not tracked',
    alertsResolved: 0
  };

  private authService = inject(Auth);
  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private signalService = inject(OperationSignal);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit() {
    const cachedUser = this.authService.getCurrentUser();

    if (cachedUser) {
      this.applyUser(cachedUser);
      this.profileLoading = false;
    }

    this.loadProfile();
    this.loadStats();
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

  get memberSince() {
    return this.formatDate(this.user?.memberSince);
  }

  get lastLogin() {
    return this.formatDate(this.user?.lastLogin);
  }

  loadProfile() {
    this.profileLoading = !this.user;
    this.loadError = '';

    this.authService.getProfile().subscribe({
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
      farms: this.farmService.getFarms(),
      fields: this.fieldService.getFields(),
      crops: this.cropService.getCrops(),
      records: this.financialService.getRecords(),
      signals: this.signalService.getSignals()
    }).subscribe({
      next: (data: any) => {
        const farms = getCurrentFarms(data.farms || []);
        const fields = getCurrentFields(farms, data.fields || []);
        const records = getCurrentRecords(farms, data.records || []);
        const crops = getCurrentCrops(farms, fields, data.crops || [], records);
        const signals = getCurrentSignals(farms, fields, data.signals || []);

        this.stats = {
          farmsManaged: farms.length,
          fieldsManaged: fields.length,
          cropsRegistered: crops.length,
          financialRecords: records.length,
          reportsGenerated: 'Not tracked',
          alertsResolved: signals.filter((signal: any) => signal.status === 'Resolved').length
        };

        this.statsLoading = false;
      },
      error: (error) => {
        console.error(error);
        this.statsLoading = false;
      }
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
}
