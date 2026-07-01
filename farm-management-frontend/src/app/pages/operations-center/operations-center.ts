import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { OperationSignal } from '../../services/operation-signal';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import {
  LucideActivity,
  LucideBadgeDollarSign,
  LucideBell,
  LucideCheckCircle2,
  LucideCloudSun,
  LucideDroplet,
  LucideLeaf,
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
    LucideShieldAlert,
    LucideSprout,
    EmptyStateComponent
  ],
  templateUrl: './operations-center.html',
  styleUrl: './operations-center.css'
})
export class OperationsCenter implements OnInit, OnDestroy {

  allSignals: any[] = [];
  signals: any[] = [];
  loading = false;
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
  private cdr = inject(ChangeDetectorRef);
  private routeSubscription?: Subscription;
  private hasLoadedSignals = false;
  private loadingRequestInFlight = false;

  ngOnInit(): void {
    this.initializeSignals();
    this.routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects.startsWith('/operations-center')) {
          this.initializeSignals();
        }
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  initializeSignals() {
    if (this.loadingRequestInFlight) {
      return;
    }

    if (this.hasLoadedSignals) {
      this.applyFilters();
      return;
    }

    queueMicrotask(() => this.loadSignals());
  }

  loadSignals(clearMessage = true, showLoading = true) {
    if (this.loadingRequestInFlight) {
      return;
    }

    this.loadingRequestInFlight = true;
    this.loading = showLoading;
    if (clearMessage) {
      this.message = '';
    }
    this.cdr.detectChanges();

    this.operationSignalService.getSignals().subscribe({
      next: (data: any) => {
        this.allSignals = Array.isArray(data) ? [...data] : [];
        this.applyFilters();
        this.loading = false;
        this.loadingRequestInFlight = false;
        this.hasLoadedSignals = true;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.message = 'Unable to load operation signals.';
        this.loading = false;
        this.loadingRequestInFlight = false;
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange() {
    if (
      this.filterFarm !== 'All' &&
      this.filterField !== 'All'
    ) {
      const selectedField = this.allSignals
        .map(signal => signal.field)
        .find(field => this.getEntityId(field) === this.filterField);
      const selectedFieldFarmId =
        this.getEntityId(selectedField?.farm);

      if (
        selectedFieldFarmId &&
        selectedFieldFarmId !== this.filterFarm
      ) {
        this.filterField = 'All';
      }
    }

    this.applyFilters();
    this.cdr.detectChanges();
  }

  applyFilters() {
    this.signals = this.allSignals.filter(signal => {
      const statusMatches =
        this.filterStatus === 'All' ||
        signal.status === this.filterStatus;
      const categoryMatches =
        this.filterCategory === 'All' ||
        signal.category === this.filterCategory;
      const priorityMatches =
        this.filterPriority === 'All' ||
        signal.priority === this.filterPriority;
      const farmMatches =
        this.filterFarm === 'All' ||
        this.getSignalFarmId(signal) === this.filterFarm;
      const fieldMatches =
        this.filterField === 'All' ||
        this.getSignalFieldId(signal) === this.filterField;

      return statusMatches &&
        categoryMatches &&
        priorityMatches &&
        farmMatches &&
        fieldMatches;
    });
  }

  resolveSignal(signal: any) {
    const signalId = signal?._id;
    if (!signalId || this.resolvingSignalIds.has(signalId)) {
      return;
    }

    this.resolvingSignalIds.add(signalId);
    this.message = '';
    this.cdr.detectChanges();

    this.operationSignalService.resolveSignal(signalId).subscribe({
      next: (resolvedSignal: any) => {
        const updatedSignal = {
          ...signal,
          ...resolvedSignal,
          status: 'Resolved',
          resolvedAt: resolvedSignal?.resolvedAt || new Date().toISOString()
        };

        this.allSignals = this.allSignals.map(item =>
          item._id === signalId ? updatedSignal : item
        );
        this.applyFilters();

        this.resolvingSignalIds.delete(signalId);
        this.message = 'Operation signal resolved.';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.resolvingSignalIds.delete(signalId);
        this.message = 'Unable to resolve this operation signal.';
        this.cdr.detectChanges();
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
    this.message = '';
    this.applyFilters();
    this.cdr.detectChanges();
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
    return this.allSignals.filter(signal => signal.status === 'Active').length;
  }

  get criticalAlerts() {
    return this.allSignals.filter(signal =>
      signal.status === 'Active' &&
      signal.priority === 'Critical'
    ).length;
  }

  get highPriorityAlerts() {
    return this.allSignals.filter(signal =>
      signal.status === 'Active' &&
      ['Critical', 'High'].includes(signal.priority)
    ).length;
  }

  get resolvedAlerts() {
    return this.allSignals.filter(signal => signal.status === 'Resolved').length;
  }

  get farms() {
    const farmMap =
      new Map<string, any>();

    this.allSignals.forEach(signal => {
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

    this.allSignals.forEach(signal => {
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
    if (!signal.farm && signal.category === 'Financial') {
      return 'Global financial signal';
    }

    return signal.farm?.name || 'Unavailable farm';
  }

  getFieldName(signal: any) {
    return signal.field?.name || '';
  }

  getLifecycleStage(signal: any) {
    if (signal.category !== 'Crop Lifecycle') {
      return '';
    }

    return signal.field?.crop?.currentStage || '';
  }

  getLifecycleHarvestDate(signal: any) {
    if (signal.category !== 'Crop Lifecycle') {
      return '';
    }

    return signal.field?.crop?.expectedHarvestDate || '';
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
