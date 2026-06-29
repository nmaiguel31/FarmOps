import {
  Component,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OperationSignal } from '../../services/operation-signal';
import {
  LucideActivity,
  LucideBadgeDollarSign,
  LucideBell,
  LucideCheckCircle2,
  LucideCloudSun,
  LucideDroplet,
  LucideLeaf,
  LucideRefreshCw,
  LucideShieldAlert,
  LucideSprout
} from '@lucide/angular';

@Component({
  selector: 'app-operations-center',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideActivity,
    LucideBadgeDollarSign,
    LucideBell,
    LucideCheckCircle2,
    LucideCloudSun,
    LucideDroplet,
    LucideLeaf,
    LucideRefreshCw,
    LucideShieldAlert,
    LucideSprout
  ],
  templateUrl: './operations-center.html',
  styleUrl: './operations-center.css'
})
export class OperationsCenter implements OnInit {

  signals: any[] = [];
  loading = false;
  generating = false;
  message = '';
  resolvingSignalIds = new Set<string>();

  filterStatus = 'Active';
  filterCategory = 'All';
  filterPriority = 'All';
  filterFarm = 'All';
  filterField = 'All';

  readonly statuses = [
    'Active',
    'Resolved',
    'All'
  ];

  readonly categories = [
    'All',
    'Irrigation',
    'Weather',
    'Crop Lifecycle',
    'Financial',
    'NDVI',
    'System'
  ];

  readonly priorities = [
    'All',
    'Critical',
    'High',
    'Medium',
    'Low'
  ];

  private operationSignalService = inject(OperationSignal);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadSignals();
  }

  loadSignals(clearMessage = true) {
    this.loading = true;
    if (clearMessage) {
      this.message = '';
    }

    this.operationSignalService.getSignals({
      status: this.filterStatus,
      category: this.filterCategory,
      priority: this.filterPriority,
      farm: this.filterFarm,
      field: this.filterField
    }).subscribe({
      next: (data: any) => {
        this.signals = [...data];
        this.loading = false;
      },
      error: (error) => {
        console.error(error);
        this.message = 'Unable to load operation signals.';
        this.loading = false;
      }
    });
  }

  generateSignals() {
    this.generating = true;
    this.message = '';

    this.operationSignalService.generateSignals().subscribe({
      next: (data: any) => {
        const createdCount =
          Number(data?.createdCount || 0);
        const reopenedCount =
          Number(data?.reopenedCount || 0);
        this.message =
          createdCount || reopenedCount
            ? `${createdCount} new and ${reopenedCount} reopened operation signal${createdCount + reopenedCount === 1 ? '' : 's'}.`
            : 'No new operation signals were detected.';
        this.generating = false;
        this.loadSignals(false);
      },
      error: (error) => {
        console.error(error);
        this.message = 'Unable to generate operation signals.';
        this.generating = false;
      }
    });
  }

  resolveSignal(signal: any) {
    const signalId = signal?._id;
    if (!signalId || this.resolvingSignalIds.has(signalId)) {
      return;
    }

    this.resolvingSignalIds.add(signalId);
    this.message = '';

    this.operationSignalService.resolveSignal(signalId).subscribe({
      next: (resolvedSignal: any) => {
        const updatedSignal = {
          ...signal,
          ...resolvedSignal,
          status: 'Resolved',
          resolvedAt: resolvedSignal?.resolvedAt || new Date().toISOString()
        };

        if (this.filterStatus === 'Active') {
          this.signals = this.signals.filter(item => item._id !== signalId);
        } else {
          this.signals = this.signals.map(item =>
            item._id === signalId ? updatedSignal : item
          );
        }

        this.resolvingSignalIds.delete(signalId);
        this.message = 'Operation signal resolved.';
        this.loadSignals(false);
      },
      error: (error) => {
        console.error(error);
        this.resolvingSignalIds.delete(signalId);
        this.message = 'Unable to resolve this operation signal.';
      }
    });
  }

  isResolving(signal: any) {
    return this.resolvingSignalIds.has(signal?._id);
  }

  resetFilters() {
    this.filterStatus = 'Active';
    this.filterCategory = 'All';
    this.filterPriority = 'All';
    this.filterFarm = 'All';
    this.filterField = 'All';
    this.loadSignals();
  }

  viewFarm(signal: any) {
    if (!this.hasLinkedFarm(signal)) {
      this.message = 'Linked farm or field is no longer available.';
      return;
    }

    this.router.navigate(['/farms'], {
      queryParams: {
        farmId: this.getSignalFarmId(signal)
      }
    });
  }

  viewField(signal: any) {
    if (!this.hasLinkedFarm(signal) || !this.hasLinkedField(signal)) {
      this.message = 'Linked farm or field is no longer available.';
      return;
    }

    this.router.navigate(['/farms'], {
      queryParams: {
        farmId: this.getSignalFarmId(signal),
        fieldId: this.getSignalFieldId(signal)
      }
    });
  }

  hasLinkedFarm(signal: any) {
    return Boolean(this.getSignalFarmId(signal));
  }

  hasLinkedField(signal: any) {
    return Boolean(this.getSignalFieldId(signal));
  }

  get activeAlerts() {
    return this.signals.filter(signal => signal.status === 'Active').length;
  }

  get criticalAlerts() {
    return this.signals.filter(signal =>
      signal.status === 'Active' &&
      signal.priority === 'Critical'
    ).length;
  }

  get highPriorityAlerts() {
    return this.signals.filter(signal =>
      signal.status === 'Active' &&
      ['Critical', 'High'].includes(signal.priority)
    ).length;
  }

  get resolvedAlerts() {
    return this.signals.filter(signal => signal.status === 'Resolved').length;
  }

  get farms() {
    const farmMap =
      new Map<string, any>();

    this.signals.forEach(signal => {
      const farmId =
        this.getEntityId(signal.farm);

      if (farmId) {
        farmMap.set(farmId, signal.farm);
      }
    });

    return Array.from(farmMap.values());
  }

  get fields() {
    const fieldMap =
      new Map<string, any>();

    this.signals.forEach(signal => {
      const fieldId =
        this.getEntityId(signal.field);

      if (fieldId) {
        fieldMap.set(fieldId, signal.field);
      }
    });

    return Array.from(fieldMap.values());
  }

  get summaryCards() {
    return [
      {
        label: 'Active Alerts',
        value: this.activeAlerts,
        tone: 'active',
        icon: 'bell'
      },
      {
        label: 'Critical',
        value: this.criticalAlerts,
        tone: 'critical',
        icon: 'critical'
      },
      {
        label: 'High Priority',
        value: this.highPriorityAlerts,
        tone: 'high',
        icon: 'activity'
      },
      {
        label: 'Resolved',
        value: this.resolvedAlerts,
        tone: 'resolved',
        icon: 'resolved'
      }
    ];
  }

  getCategoryIcon(category: string) {
    switch (category) {
      case 'Irrigation':
        return 'irrigation';
      case 'Weather':
        return 'weather';
      case 'Crop Lifecycle':
        return 'crop';
      case 'Financial':
        return 'financial';
      case 'NDVI':
        return 'ndvi';
      default:
        return 'system';
    }
  }

  getFarmName(signal: any) {
    return signal.farm?.name || 'Unavailable farm';
  }

  getFieldName(signal: any) {
    return signal.field?.name || '';
  }

  formatDate(date: any) {
    if (!date) {
      return 'Not dated';
    }

    const parsedDate =
      new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Not dated';
    }

    return parsedDate.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }

  private getEntityId(entity: any) {
    return String(entity?._id || entity || '');
  }

  private getSignalFarmId(signal: any) {
    return this.getEntityId(signal.farm) || String(signal.farmId || '');
  }

  private getSignalFieldId(signal: any) {
    return this.getEntityId(signal.field) || String(signal.fieldId || '');
  }

}
