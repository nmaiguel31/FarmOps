import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import {
  addFarmOpsPdfFooters,
  drawFarmOpsPdfHeader,
  formatFarmOpsGeneratedDateTime,
  loadFarmOpsPdfLogo
} from '../../shared/pdf-branding';
import {
  LucideActivity,
  LucideBadgeDollarSign,
  LucideBarChart3,
  LucideCloudSun,
  LucideDownload,
  LucideFileText,
  LucideLeaf,
  LucideShieldAlert,
  LucideSprout
} from '@lucide/angular';
import { forkJoin, of } from 'rxjs';
import { Crop } from '../../services/crop';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { FinancialRecord } from '../../services/financial-record';
import { OperationSignal } from '../../services/operation-signal';
import { Zone } from '../../services/zone';
import { Auth } from '../../services/auth';
import { AuditLogService } from '../../services/audit-log';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import { ToastService } from '../../shared/toast/toast.service';
import { MetricInfoTooltip } from '../../shared/metric-info/metric-info-tooltip';
import { RecommendationCard } from '../../shared/recommendation-card/recommendation-card';
import {
  getCurrentCrops,
  getCurrentFields,
  getCurrentRecords,
  getCurrentSignals,
  getCurrentZones,
  getEntityId as getScopedEntityId,
  isCurrentRecord
} from '../../shared/current-data-scope';

Chart.register(...registerables);

const REPORT_THEME = {
  primary: '#14915f',
  primaryStrong: '#0e6f49',
  secondary: '#79ad32',
  cloudBlue: '#4f83a8',
  warning: '#c8891f',
  danger: '#b44435',
  text: '#142018',
  muted: '#53645a',
  border: '#dfe8dc',
  surfaceSoft: '#f6f8f3'
};

@Component({
  selector: 'app-executive-reports',
  imports: [
    CommonModule,
    FormsModule,
    LucideActivity,
    LucideBadgeDollarSign,
    LucideBarChart3,
    LucideCloudSun,
    LucideDownload,
    LucideFileText,
    LucideLeaf,
    LucideShieldAlert,
    LucideSprout,
    EmptyStateComponent,
    MetricInfoTooltip,
    RecommendationCard
  ],
  templateUrl: './executive-reports.html',
  styleUrl: './executive-reports.css'
})
export class ExecutiveReports implements OnInit, AfterViewInit, OnDestroy {

  farms: any[] = [];
  fields: any[] = [];
  zones: any[] = [];
  crops: any[] = [];
  records: any[] = [];
  signals: any[] = [];
  loading = true;
  loadError = '';
  exportActionLoading = false;
  periodPreset = 'this-month';
  customStartDate = '';
  customEndDate = '';
  reportSearch = '';
  readonly periodOptions = [
    { value: 'today', label: 'Today' },
    { value: 'last-7-days', label: 'Last 7 Days' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'last-3-months', label: 'Last 3 Months' },
    { value: 'this-year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private zoneService = inject(Zone);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private operationSignalService = inject(OperationSignal);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private toast = inject(ToastService);
  private authService = inject(Auth);
  private auditLogService = inject(AuditLogService);
  private pdfLogoDataUrl = '';
  private chartRenderTimer: any = null;
  private viewReady = false;
  private dataReady = false;

  ngOnInit(): void {
    this.loadReportData();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChartsSoon();
  }

  ngOnDestroy(): void {
    if (this.chartRenderTimer) {
      clearTimeout(this.chartRenderTimer);
    }

    Chart.getChart('executiveFinancialTrendChart')?.destroy();
    Chart.getChart('executiveFinancialSummaryChart')?.destroy();
    Chart.getChart('executiveOperationsChart')?.destroy();
    Chart.getChart('executiveCropProfitChart')?.destroy();
  }

  loadReportData() {
    this.loading = true;
    this.loadError = '';
    this.dataReady = false;

    forkJoin({
      farms: this.authService.hasPermission('farms.read') ? this.farmService.getFarms() : of([]),
      fields: this.authService.hasPermission('fields.read') ? this.fieldService.getFields() : of([]),
      zones: this.canViewOperationalReports ? this.zoneService.getZones() : of([]),
      crops: this.authService.hasPermission('crops.read') ? this.cropService.getCrops() : of([]),
      records: this.authService.canAccess('financial-records') ? this.financialService.getRecords() : of([]),
      signals: this.authService.canAccess('operations-center') ? this.operationSignalService.getSignals({ status: 'All' }) : of([])
    }).subscribe({
      next: (data: any) => {
        this.zone.run(() => {
          this.farms = [...(data.farms || [])];
          this.fields = getCurrentFields(this.farms, data.fields || []);
          this.zones = getCurrentZones(this.fields, data.zones || []);
          this.records =
            !this.authService.hasPermission('farms.read') && this.authService.canAccess('financial-records')
              ? (data.records || []).filter(isCurrentRecord)
              : getCurrentRecords(this.farms, data.records || []);
          this.crops = getCurrentCrops(this.farms, this.fields, data.crops || [], this.records);
          this.signals = getCurrentSignals(this.farms, this.fields, data.signals || []);
          this.loading = false;
          this.dataReady = true;
          this.cdr.markForCheck();
          this.renderChartsSoon();
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error(error);
          this.loadError = 'Unable to load executive report data.';
          this.loading = false;
          this.dataReady = true;
          this.cdr.markForCheck();
        });
      }
    });
  }

  get hasOperationalData() {
    return this.farms.length > 0 ||
      this.records.length > 0 ||
      this.signals.length > 0;
  }

  get canViewOperationalReports() {
    return this.authService.hasPermission('reports.read.all') ||
      this.authService.hasPermission('reports.read.farm');
  }

  get canViewFinancialReports() {
    return this.authService.hasPermission('reports.read.all') ||
      this.authService.hasPermission('reports.read.financial');
  }

  get periodRange() {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (this.periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    if (this.periodPreset === 'last-7-days') {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    if (this.periodPreset === 'last-month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    if (this.periodPreset === 'last-3-months') {
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    if (this.periodPreset === 'this-year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    if (this.periodPreset === 'custom') {
      const customStart = this.customStartDate ? new Date(`${this.customStartDate}T00:00:00`) : start;
      const customEnd = this.customEndDate ? new Date(`${this.customEndDate}T23:59:59.999`) : end;

      if (Number.isFinite(customStart.getTime())) {
        start = customStart;
      }

      if (Number.isFinite(customEnd.getTime())) {
        end = customEnd;
      }
    }

    return { start, end };
  }

  get periodLabel() {
    const label =
      this.periodOptions.find(option => option.value === this.periodPreset)?.label || 'This Month';

    return this.periodPreset === 'custom'
      ? 'Custom Range'
      : label;
  }

  get startDateLabel() {
    return this.formatDate(this.periodRange.start);
  }

  get endDateLabel() {
    return this.formatDate(this.periodRange.end);
  }

  get generatedOnLabel() {
    return formatFarmOpsGeneratedDateTime();
  }

  get periodRecords() {
    return this.records.filter(record =>
      this.isWithinPeriod(record.date || record.createdAt)
    );
  }

  get periodSignals() {
    return this.signals.filter(signal =>
      this.isWithinPeriod(signal.createdAt || signal.resolvedAt)
    );
  }

  get activeSignals() {
    return this.periodSignals.filter(signal => signal.status === 'Active');
  }

  get resolvedSignals() {
    return this.periodSignals.filter(signal => signal.status === 'Resolved');
  }

  get totalRevenue() {
    return this.sumRecords('Income');
  }

  get totalExpenses() {
    return this.sumRecords('Expense');
  }

  get monthlyProfit() {
    return this.periodRecords
      .reduce((sum, record) => {
        const amount = Number(record.amount || 0);
        return sum + (record.type === 'Income' ? amount : -amount);
      }, 0);
  }

  get averageHealth() {
    const values = this.fields
      .map(field => this.getFieldHealthIndex(field))
      .filter((value): value is number => value !== null);

    return this.average(values);
  }

  get averageNdvi() {
    return this.average(this.fields.map(field => this.getFieldNdviPercent(field)));
  }

  get activeCrops() {
    return new Set(
      this.fields
        .filter(field => this.isActiveFieldCropCycle(field))
        .map(field => `${this.getEntityId(field.farm)}:${this.getEntityId(field.crop)}`)
        .filter(key => !key.endsWith(':'))
    ).size;
  }

  get weatherRisk() {
    const activeWeather =
      this.activeSignals.filter(signal => signal.category === 'Weather');

    if (activeWeather.some(signal => ['Critical', 'High'].includes(signal.priority))) {
      return 'Elevated';
    }

    return activeWeather.length ? 'Monitoring' : 'Stable';
  }

  get summaryCards() {
    const cards = [
      {
        label: 'Operational Score',
        value: this.operationalScore,
        helper: this.operationalScoreStatus,
        icon: 'operations',
        metric: 'operationalScore',
        tone: this.operationalScore >= 75 ? 'good' : this.operationalScore >= 50 ? 'warning' : 'danger'
      },
      {
        label: 'Overall Farm Health',
        value: this.averageHealth ? `${this.averageHealth}%` : 'No data',
        helper: 'Average active field health',
        icon: 'health',
        metric: 'overallFarmHealth',
        tone: this.averageHealth >= 75 ? 'good' : this.averageHealth >= 50 ? 'warning' : 'danger'
      },
      {
        label: 'Period Profit',
        value: this.formatCurrency(this.monthlyProfit),
        helper: this.periodLabel,
        icon: 'profit',
        metric: 'periodProfit',
        tone: this.monthlyProfit >= 0 ? 'good' : 'danger'
      },
      {
        label: 'Average NDVI',
        value: this.averageNdvi ? this.toNdviDecimal(this.averageNdvi) : 'No data',
        helper: 'Vegetation health signal',
        icon: 'ndvi',
        metric: 'averageNdvi',
        tone: this.averageNdvi >= 70 ? 'good' : this.averageNdvi >= 50 ? 'warning' : 'danger'
      },
      {
        label: 'Active Operations',
        value: this.activeSignals.length,
        helper: 'Unresolved signals',
        icon: 'operations',
        metric: 'activeOperations',
        tone: this.activeSignals.length ? 'warning' : 'good'
      },
      {
        label: 'Weather Risk',
        value: this.weatherRisk,
        helper: 'From active weather signals',
        icon: 'weather',
        metric: 'weatherRisk',
        tone: this.weatherRisk === 'Stable' ? 'good' : 'warning'
      },
      {
        label: 'Total Farms',
        value: this.farms.length,
        helper: `${this.fields.length} fields monitored`,
        icon: 'farms',
        metric: 'totalFarms',
        tone: 'neutral'
      },
      {
        label: 'Active Crops',
        value: this.activeCrops,
        helper: 'Linked to active fields',
        icon: 'crops',
        metric: 'activeCrops',
        tone: 'neutral'
      }
    ];

    return cards.filter(card => {
      if (['Period Profit'].includes(card.label)) {
        return this.canViewFinancialReports;
      }

      if (['Operational Score', 'Overall Farm Health', 'Average NDVI', 'Active Operations', 'Weather Risk', 'Total Farms', 'Active Crops'].includes(card.label)) {
        return this.canViewOperationalReports;
      }

      return true;
    });
  }

  get operationalScore() {
    const healthScore = this.averageHealth || 50;
    const ndviScore = this.averageNdvi || 50;
    const profitScore =
      this.totalRevenue
        ? Math.max(0, Math.min(100, Math.round(((this.totalRevenue - this.totalExpenses) / this.totalRevenue) * 100)))
        : this.hasFinancialData ? 35 : 65;
    const criticalHighPenalty =
      Math.min(this.countPriority('Critical') * 18 + this.countPriority('High') * 10, 35);
    const weatherPenalty =
      this.weatherRisk === 'Elevated' ? 12 : this.weatherRisk === 'Monitoring' ? 6 : 0;

    return Math.max(
      0,
      Math.min(
        100,
        Math.round((healthScore * .3) + (ndviScore * .25) + (profitScore * .25) + 20 - criticalHighPenalty - weatherPenalty)
      )
    );
  }

  get operationalScoreStatus() {
    if (this.operationalScore >= 75) {
      return 'Healthy Operation';
    }

    if (this.operationalScore >= 50) {
      return 'Watchlist';
    }

    return 'Critical Attention Required';
  }

  get farmPerformanceRows() {
    return this.farms.map(farm => {
      const farmId = this.getEntityId(farm);
      const farmFields = this.fields.filter(field => this.getEntityId(field.farm) === farmId);
      const farmSignals = this.activeSignals.filter(signal => this.getEntityId(signal.farm) === farmId);
      const farmRecords = this.periodRecords.filter(record => this.getEntityId(record.farm) === farmId);
      const revenue = this.sumRecordSet(farmRecords, 'Income');
      const expenses = this.sumRecordSet(farmRecords, 'Expense');
      const avgNdvi = this.average(farmFields.map(field => this.getFieldNdviPercent(field)));

      return {
        farm,
        area: this.formatArea(farm.size),
        fields: farmFields.length,
        averageNdvi: avgNdvi ? this.toNdviDecimal(avgNdvi) : 'No data',
        activeAlerts: farmSignals.length,
        revenue,
        expenses,
        profit: revenue - expenses,
        status: this.getOperationalStatus(farmSignals, avgNdvi)
      };
    });
  }

  get filteredFarmPerformanceRows() {
    const search =
      this.normalizeSearch(this.reportSearch);

    if (!search) {
      return this.farmPerformanceRows;
    }

    return this.farmPerformanceRows.filter(row =>
      [
        row.farm?.name,
        row.farm?.location,
        row.status,
        row.averageNdvi,
        row.fields
      ]
        .some(value => this.normalizeSearch(value).includes(search))
    );
  }

  get cropPerformanceRows() {
    const rowKeys = new Map<string, { cropId: string; farmId: string; crop: any; farm: any }>();

    this.fields
      .filter(field => this.getEntityId(field.crop))
      .forEach(field => {
        const cropId = this.getEntityId(field.crop);
        const farmId = this.getEntityId(field.farm);
        const key = `${farmId}:${cropId}`;
        rowKeys.set(key, {
          cropId,
          farmId,
          crop: this.getCropById(cropId) || field.crop,
          farm: this.getFarmById(farmId) || field.farm
        });
      });

    this.periodRecords
      .filter(record => this.getEntityId(record.crop))
      .forEach(record => {
        const cropId = this.getEntityId(record.crop);
        const farmId = this.getEntityId(record.farm);
        const key = `${farmId}:${cropId}`;
        rowKeys.set(key, {
          cropId,
          farmId,
          crop: this.getCropById(cropId) || record.crop,
          farm: this.getFarmById(farmId) || record.farm
        });
      });

    return Array.from(rowKeys.values())
      .filter(row => this.isRelevantCropRow(row.cropId, row.farmId))
      .map(row => {
        const cropFields = this.fields.filter(field =>
          this.getEntityId(field.crop) === row.cropId &&
          this.getEntityId(field.farm) === row.farmId
        );
        const cropRecords = this.periodRecords.filter(record =>
          this.getEntityId(record.crop) === row.cropId &&
          this.getEntityId(record.farm) === row.farmId
        );
        const cropObject =
          row.crop && typeof row.crop === 'object'
            ? row.crop
            : { name: 'Unavailable crop', type: 'Crop' };
        const farmObject =
          row.farm && typeof row.farm === 'object'
            ? row.farm
            : this.getFarmById(row.farmId);
        const revenue = this.sumRecordSet(cropRecords, 'Income');
        const expenses = this.sumRecordSet(cropRecords, 'Expense');
        const avgHealth = this.average(
          cropFields
            .map(field => this.getFieldHealthIndex(field))
            .filter((value): value is number => value !== null)
        );
        const avgNdvi = this.average(cropFields.map(field => this.getFieldNdviPercent(field)));
        const representativeField = cropFields[0];
        const stage =
          representativeField?.currentStage ||
          'Not started';

        return {
          crop: cropObject,
          farm: farmObject?.name || 'Unassigned farm',
          revenue,
          expenses,
          profit: revenue - expenses,
          averageHealth: avgHealth ? `${avgHealth}%` : 'No field data',
          ndvi: avgNdvi ? this.toNdviDecimal(avgNdvi) : 'No field data',
          stage
        };
      });
  }

  get filteredCropPerformanceRows() {
    const search =
      this.normalizeSearch(this.reportSearch);

    if (!search) {
      return this.cropPerformanceRows;
    }

    return this.cropPerformanceRows.filter(row =>
      [
        row.crop?.name,
        row.crop?.type,
        row.farm,
        row.stage,
        row.averageHealth,
        row.ndvi
      ]
        .some(value => this.normalizeSearch(value).includes(search))
    );
  }

  clearReportFilters() {
    this.reportSearch = '';
  }

  get operationsSummary() {
    return [
      { label: 'Total Active Signals', value: this.activeSignals.length, tone: 'warning' },
      { label: 'Resolved Signals', value: this.resolvedSignals.length, tone: 'good' },
      { label: 'Weather Alerts', value: this.countSignals('Weather'), tone: 'sky' },
      { label: 'NDVI Alerts', value: this.countSignals('NDVI'), tone: 'good' },
      { label: 'Financial Alerts', value: this.countSignals('Financial'), tone: 'danger' },
      { label: 'Lifecycle Alerts', value: this.countSignals('Crop Lifecycle'), tone: 'leaf' },
      { label: 'Critical Alerts', value: this.countPriority('Critical'), tone: 'danger' },
      { label: 'High Priority Alerts', value: this.countPriority('High'), tone: 'warning' }
    ];
  }

  get executiveRecommendations() {
    const recommendations: Array<{ category: string; items: string[] }> = [];
    const riskyFarms = this.farmPerformanceRows.filter(row =>
      row.activeAlerts > 0 || row.status !== 'Stable'
    );
    const drySignals = this.activeSignals.filter(signal => signal.category === 'Irrigation');
    const lifecycleSignals = this.activeSignals.filter(signal => signal.category === 'Crop Lifecycle');
    const financialSignals = this.activeSignals.filter(signal => signal.category === 'Financial');

    if (!this.hasOperationalData) {
      return [
        {
          category: 'Operational',
          items: ['No operational data is available yet. Create farms and fields to generate executive reports.']
        }
      ];
    }

    const addRecommendation = (category: string, item: string) => {
      let group = recommendations.find(section => section.category === category);

      if (!group) {
        group = { category, items: [] };
        recommendations.push(group);
      }

      group.items.push(item);
    };

    if (riskyFarms.length) {
      addRecommendation('Operational', `Monitor ${riskyFarms[0].farm.name}; it has ${riskyFarms[0].activeAlerts} active operational signal(s).`);
    }

    if (financialSignals.length || this.totalRevenue < this.totalExpenses) {
      addRecommendation('Financial', 'Review operating costs against revenue by farm and crop for the selected reporting period.');
    } else if (this.periodRecords.length) {
      addRecommendation('Financial', 'Financial performance remains stable based on current revenue and expense records.');
    }

    if (this.activeSignals.some(signal => signal.category === 'Weather')) {
      addRecommendation('Weather', 'Review active weather signals before scheduling irrigation, spraying, or harvest operations.');
    }

    if (this.averageNdvi && this.averageNdvi < 60) {
      addRecommendation('Vegetation', 'Review fields with weak vegetation performance and inspect for irrigation, pest, or nutrient stress.');
    }

    if (drySignals.length) {
      addRecommendation('Operational', 'Review irrigation schedules for fields with dry conditions or low soil moisture.');
    }

    if (lifecycleSignals.length) {
      addRecommendation('Crop Lifecycle', 'Prepare labor, logistics, and equipment for upcoming lifecycle or harvest operations.');
    }

    return recommendations.slice(0, 5);
  }

  get visibleExecutiveRecommendations() {
    return this.executiveRecommendations.filter(group => {
      if (group.category === 'Financial') {
        return this.canViewFinancialReports;
      }

      return this.canViewOperationalReports;
    });
  }

  get hasFinancialData() {
    return this.periodRecords.length > 0;
  }

  get hasCropPerformanceData() {
    return this.cropPerformanceRows.length > 0;
  }

  get hasOperationsData() {
    return this.periodSignals.length > 0;
  }

  get profitByCropEntries() {
    return this.cropPerformanceRows
      .filter(row => row.revenue || row.expenses)
      .map(row => ({
        crop: row.crop.name,
        profit: row.profit
      }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 8);
  }

  get operationsDistribution() {
    const buckets = new Map<string, number>();

    this.periodSignals.forEach(signal => {
      const category = signal.category || 'System';
      buckets.set(category, (buckets.get(category) || 0) + 1);
    });

    return Array.from(buckets.entries()).map(([category, count]) => ({
      category,
      count
    }));
  }

  exportCSV() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;

    const farmHeaders = ['Farm', 'Area', 'Fields'];
    if (this.canViewOperationalReports) {
      farmHeaders.push('Average NDVI', 'Active Alerts', 'Operational Status');
    }
    if (this.canViewFinancialReports) {
      farmHeaders.push('Revenue', 'Expenses', 'Profit');
    }

    const cropHeaders = ['Crop', 'Farm'];
    if (this.canViewFinancialReports) {
      cropHeaders.push('Revenue', 'Expenses', 'Profit');
    }
    if (this.canViewOperationalReports) {
      cropHeaders.push('Average Health', 'NDVI', 'Lifecycle Stage');
    }

    const generatedAt =
      formatFarmOpsGeneratedDateTime();

    const sections: any[][] = [
      ['FarmOps Executive Report'],
      ['Generated', generatedAt],
      ['Reporting Period', this.getReportingPeriodLabel()],
      [],
      ['Executive Summary'],
      ['Metric', 'Value', 'Notes'],
      ...this.summaryCards.map(card => [card.label, card.value, card.helper]),
      [],
      ['Farm Performance'],
      farmHeaders,
      ...this.farmPerformanceRows.map(row => {
        const values: any[] = [row.farm.name, row.area, row.fields];
        if (this.canViewOperationalReports) {
          values.push(row.averageNdvi, row.activeAlerts, row.status);
        }
        if (this.canViewFinancialReports) {
          values.push(row.revenue, row.expenses, row.profit);
        }
        return values;
      }),
      [],
      ['Crop Performance'],
      cropHeaders,
      ...this.cropPerformanceRows.map(row => {
        const values: any[] = [row.crop.name, row.farm];
        if (this.canViewFinancialReports) {
          values.push(row.revenue, row.expenses, row.profit);
        }
        if (this.canViewOperationalReports) {
          values.push(row.averageHealth, row.ndvi, row.stage);
        }
        return values;
      })
    ];

    if (this.canViewOperationalReports) {
      sections.push(
        [],
        ['Operations Summary'],
        ['Metric', 'Value'],
        ...this.operationsSummary.map(item => [item.label, item.value])
      );
    }

    if (this.visibleExecutiveRecommendations.length) {
      sections.push(
        [],
        ['Executive Recommendations'],
        ...this.visibleExecutiveRecommendations.flatMap(group => [
          [group.category],
          ...group.items.map(item => [item])
        ])
      );
    }

    const csvContent = sections
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'farmops-executive-report.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toast.success('Report CSV exported', 'Executive report data is ready.');
    this.recordReportExport('CSV');
    this.exportActionLoading = false;
  }

  async exportPDF() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;

    this.pdfLogoDataUrl = await loadFarmOpsPdfLogo();
    const doc = new jsPDF();
    let y = this.drawPdfHeader(doc);

    doc.setTextColor(REPORT_THEME.text);
    doc.setFontSize(10);
    doc.text(`Reporting period: ${this.getReportingPeriodLabel()}`, 20, y);
    doc.text(`Generated: ${formatFarmOpsGeneratedDateTime()}`, 130, y, { maxWidth: 66 });
    y += 12;

    y = this.ensurePdfSpace(doc, y, 58);
    doc.setTextColor(REPORT_THEME.text);
    doc.setFontSize(13);
    doc.text('Executive Summary', 20, y);
    y += 8;
    y = this.drawPdfSummaryCards(doc, y);

    if (this.canViewFinancialReports) {
      y += 6;
      y = this.ensurePdfSpace(doc, y, 44);
      doc.setFontSize(13);
      doc.text('Financial Visual Summary', 20, y);
      y += 8;
      y = this.drawPdfFinancialBars(doc, y);
    }

    if (this.canViewOperationalReports) {
      y += 6;
      y = this.ensurePdfSpace(doc, y, 44);
      doc.setFontSize(13);
      doc.text('Operations Distribution', 20, y);
      y += 8;
      y = this.drawPdfOperationsBars(doc, y);
    }

    if (this.canViewFinancialReports && this.profitByCropEntries.length) {
      y += 6;
      y = this.ensurePdfSpace(doc, y, 44);
      doc.setFontSize(13);
      doc.text('Crop Profitability', 20, y);
      y += 8;
      y = this.drawPdfCropProfitBars(doc, y);
    }

    y += 6;
    y = this.ensurePdfSpace(doc, y, 42);
    doc.setFontSize(13);
    doc.text('Farm Performance', 20, y);
    y += 8;
    doc.setFontSize(8);
    this.farmPerformanceRows.forEach(row => {
      const parts = [`${row.farm.name}`, `${row.area} ha`, `${row.fields} fields`];
      if (this.canViewOperationalReports) {
        parts.push(`NDVI ${row.averageNdvi}`, row.status);
      }
      if (this.canViewFinancialReports) {
        parts.push(`Profit ${this.formatCurrency(row.profit)}`);
      }
      y = this.writePdfLine(
        doc,
        parts.join(' | '),
        y
      );
    });

    y += 6;
    y = this.ensurePdfSpace(doc, y, 42);
    doc.setFontSize(13);
    doc.text('Crop Performance', 20, y);
    y += 8;
    doc.setFontSize(8);
    if (!this.cropPerformanceRows.length) {
      y = this.writePdfLine(doc, 'No crop performance data for the selected period.', y);
    }
    this.cropPerformanceRows.slice(0, 20).forEach(row => {
      const parts = [`${row.crop.name}`, row.farm];
      if (this.canViewFinancialReports) {
        parts.push(`Profit ${this.formatCurrency(row.profit)}`);
      }
      if (this.canViewOperationalReports) {
        parts.push(`Health ${row.averageHealth}`, `NDVI ${row.ndvi}`, row.stage);
      }
      y = this.writePdfLine(
        doc,
        parts.join(' | '),
        y
      );
    });

    if (this.canViewOperationalReports) {
      y += 6;
      y = this.ensurePdfSpace(doc, y, 42);
      doc.setFontSize(13);
      doc.text('Operations Summary', 20, y);
      y += 8;
      doc.setFontSize(8);
      this.operationsSummary.forEach(item => {
        y = this.writePdfLine(doc, `${item.label}: ${item.value}`, y);
      });
    }

    if (this.visibleExecutiveRecommendations.length) {
      y += 6;
      y = this.ensurePdfSpace(doc, y, 42);
      doc.setFontSize(13);
      doc.text('Executive Recommendations', 20, y);
      y += 8;
      doc.setFontSize(8);
      this.visibleExecutiveRecommendations.forEach(group => {
        y = this.writePdfLine(doc, group.category, y);
        group.items.forEach(item => {
          y = this.writePdfLine(doc, `- ${item}`, y);
        });
      });
    }

    addFarmOpsPdfFooters(doc);
    doc.save('FarmOps-Executive-Report.pdf');
    this.toast.success('Report PDF exported', 'Executive report PDF is ready.');
    this.recordReportExport('PDF');
    this.exportActionLoading = false;
  }

  private recordReportExport(format: 'CSV' | 'PDF') {
    this.auditLogService.recordAuditEvent({
      action: 'Report exported',
      module: 'Reports',
      entityType: 'Report',
      entityName: 'Executive Reports',
      details: `${format} export generated for ${this.getReportingPeriodLabel()}`,
      severity: 'success'
    }).subscribe({
      error: () => {
        // Export should not fail if audit logging is temporarily unavailable.
      }
    });
  }

  formatCurrency(value: any) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  formatArea(value: any) {
    const area = Number(value || 0);
    return Number.isFinite(area) ? area.toFixed(2) : '0.00';
  }

  getStatusClass(status: string) {
    return String(status || '').toLowerCase().replace(/\s+/g, '-');
  }

  onPeriodChange() {
    this.cdr.markForCheck();
    this.renderChartsSoon();
  }

  trackById(index: number, item: any) {
    return String(item?._id || item?.id || item?.farm?._id || item?.crop?._id || item?.label || index);
  }

  trackByValue(_index: number, item: any) {
    return item?.value || item;
  }

  trackByLabel(index: number, item: any) {
    return item?.label || item?.category || item?.title || item || index;
  }

  private getEntityId(entity: any) {
    return getScopedEntityId(entity);
  }

  private isWithinPeriod(dateValue: any) {
    if (!dateValue) {
      return false;
    }

    const timestamp = new Date(dateValue).getTime();

    if (!Number.isFinite(timestamp)) {
      return false;
    }

    return timestamp >= this.periodRange.start.getTime() &&
      timestamp <= this.periodRange.end.getTime();
  }

  private formatDate(dateValue: any) {
    const date = new Date(dateValue);

    if (!Number.isFinite(date.getTime())) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  private isRelevantCropRow(cropId: string, farmId: string) {
    const linkedExistingField =
      this.fields.some(field =>
        this.getEntityId(field.crop) === cropId &&
        this.getEntityId(field.farm) === farmId
      );
    const periodFinancialActivity =
      this.periodRecords.some(record =>
        this.getEntityId(record.crop) === cropId &&
        this.getEntityId(record.farm) === farmId
      );
    const activeCropCycle =
      this.fields.some(field =>
        this.getEntityId(field.crop) === cropId &&
        this.getEntityId(field.farm) === farmId &&
        this.isActiveFieldCropCycle(field)
      );

    return linkedExistingField ||
      periodFinancialActivity ||
      activeCropCycle;
  }

  private isActiveFieldCropCycle(field: any) {
    const cropId = this.getEntityId(field?.crop);
    const fieldStatus = String(field?.status || '').toLowerCase();
    const cropStage = String(field?.currentStage || '').toLowerCase();

    return Boolean(cropId) &&
      fieldStatus === 'active' &&
      !['harvest', 'harvested'].includes(cropStage);
  }

  private getCropById(cropId: string) {
    return this.crops.find(crop => this.getEntityId(crop) === cropId);
  }

  private getFarmById(farmId: string) {
    return this.farms.find(farm => this.getEntityId(farm) === farmId);
  }

  private sumRecords(type: string) {
    return this.sumRecordSet(this.periodRecords, type);
  }

  private sumRecordSet(records: any[], type: string) {
    return records
      .filter(record => record.type === type)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  }

  private getFieldHealthIndex(field: any) {
    const status = String(field?.status || '').toLowerCase();
    const hasCrop = Boolean(field?.crop?._id || field?.crop || field?.cropType);

    if (!hasCrop || status.includes('resting') || status.includes('harvested')) {
      return null;
    }

    let health = this.getFieldNdviPercent(field);
    const moisture = this.getFieldSoilMoisture(field);
    const irrigationStatus = String(field?.irrigationStatus || '').toLowerCase();

    if (moisture < 30) {
      health -= 20;
    } else if (moisture <= 50) {
      health -= 10;
    }

    if (irrigationStatus.includes('dry')) {
      health -= 15;
    }

    return this.clampPercent(health);
  }

  private getFieldSoilMoisture(field: any) {
    const explicit = Number(field?.soilMoisture ?? field?.moistureScore);

    if (Number.isFinite(explicit) && explicit > 0) {
      return this.clampPercent(explicit);
    }

    const irrigationStatus = String(field?.irrigationStatus || '').toLowerCase();

    if (irrigationStatus.includes('dry')) {
      return 38;
    }

    if (irrigationStatus.includes('irrigated') || irrigationStatus.includes('scheduled')) {
      return 84;
    }

    return 68;
  }

  private getFieldNdviPercent(field: any) {
    const explicit = Number(field?.ndviScore ?? field?.ndvi ?? field?.vegetationScore);

    if (Number.isFinite(explicit) && explicit > 0) {
      return this.clampPercent(explicit <= 1 ? explicit * 100 : explicit);
    }

    const healthStatus = String(field?.healthStatus || '').toLowerCase();

    if (healthStatus.includes('critical') || healthStatus.includes('poor')) {
      return 30;
    }

    if (healthStatus.includes('warning') || healthStatus.includes('fair') || healthStatus.includes('moderate')) {
      return 58;
    }

    return 82;
  }

  private clampPercent(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private average(values: number[]) {
    const filtered = values.filter(value => Number.isFinite(value));

    if (!filtered.length) {
      return 0;
    }

    return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
  }

  private toNdviDecimal(percent: number) {
    return (percent / 100).toFixed(2);
  }

  private countSignals(category: string) {
    return this.activeSignals.filter(signal => signal.category === category).length;
  }

  private countPriority(priority: string) {
    return this.activeSignals.filter(signal => signal.priority === priority).length;
  }

  private getOperationalStatus(signals: any[], avgNdvi: number) {
    if (signals.some(signal => signal.priority === 'Critical')) {
      return 'Critical';
    }

    if (signals.some(signal => signal.priority === 'High') || avgNdvi < 55) {
      return 'At Risk';
    }

    if (signals.length || avgNdvi < 70) {
      return 'Monitoring';
    }

    return 'Stable';
  }

  private renderChartsSoon() {
    if (!this.viewReady || !this.dataReady || this.loading) {
      return;
    }

    if (this.chartRenderTimer) {
      clearTimeout(this.chartRenderTimer);
    }

    this.chartRenderTimer = setTimeout(() => {
      this.chartRenderTimer = null;
      requestAnimationFrame(() => {
        this.renderFinancialTrendChart();
        this.renderFinancialSummaryChart();
        this.renderOperationsChart();
        this.renderCropProfitChart();
      });
    }, 100);
  }

  private renderFinancialTrendChart() {
    const canvas = document.getElementById('executiveFinancialTrendChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasFinancialData) {
      return;
    }

    const series = this.getMonthlyFinancialSeries();

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Revenue',
            data: series.revenue,
            borderColor: REPORT_THEME.primary,
            backgroundColor: 'rgba(20,145,95,.12)',
            tension: .35,
            fill: true
          },
          {
            label: 'Expenses',
            data: series.expenses,
            borderColor: REPORT_THEME.warning,
            backgroundColor: 'rgba(249,115,22,.1)',
            tension: .35,
            fill: true
          },
          {
            label: 'Profit',
            data: series.profit,
            borderColor: REPORT_THEME.cloudBlue,
            backgroundColor: 'rgba(15,125,194,.08)',
            tension: .35,
            fill: false
          }
        ]
      },
      options: this.lineChartOptions()
    });
  }

  private renderFinancialSummaryChart() {
    const canvas = document.getElementById('executiveFinancialSummaryChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasFinancialData) {
      return;
    }

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Revenue', 'Expenses', 'Profit'],
        datasets: [
          {
            data: [this.totalRevenue, this.totalExpenses, this.totalRevenue - this.totalExpenses],
            backgroundColor: [
              REPORT_THEME.primary,
              REPORT_THEME.warning,
              REPORT_THEME.cloudBlue
            ],
            borderRadius: 10
          }
        ]
      },
      options: this.barChartOptions()
    });
  }

  private renderOperationsChart() {
    const canvas = document.getElementById('executiveOperationsChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasOperationsData) {
      return;
    }

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.operationsDistribution.map(item => item.category),
        datasets: [
          {
            data: this.operationsDistribution.map(item => item.count),
            backgroundColor: [
              REPORT_THEME.primary,
              REPORT_THEME.cloudBlue,
              REPORT_THEME.warning,
              REPORT_THEME.danger,
              REPORT_THEME.secondary,
              '#64748b'
            ],
            borderColor: '#ffffff',
            borderWidth: 4
          }
        ]
      },
      options: this.doughnutChartOptions()
    });
  }

  private renderCropProfitChart() {
    const canvas = document.getElementById('executiveCropProfitChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.profitByCropEntries.length) {
      return;
    }

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.profitByCropEntries.map(item => item.crop),
        datasets: [
          {
            label: 'Profit',
            data: this.profitByCropEntries.map(item => item.profit),
            backgroundColor: this.profitByCropEntries.map(item =>
              item.profit >= 0 ? REPORT_THEME.primary : REPORT_THEME.danger
            ),
            borderRadius: 10
          }
        ]
      },
      options: this.barChartOptions()
    });
  }

  private getMonthlyFinancialSeries() {
    const buckets = new Map<string, { revenue: number; expenses: number; timestamp: number }>();

    this.periodRecords.forEach(record => {
      const date = new Date(record.date || record.createdAt);

      if (!Number.isFinite(date.getTime())) {
        return;
      }

      const label = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric'
      }).format(date);
      const bucketStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();

      if (!buckets.has(label)) {
        buckets.set(label, { revenue: 0, expenses: 0, timestamp: bucketStart });
      }

      const bucket = buckets.get(label)!;

      if (record.type === 'Income') {
        bucket.revenue += Number(record.amount || 0);
      }

      if (record.type === 'Expense') {
        bucket.expenses += Number(record.amount || 0);
      }
    });

    const series = Array.from(buckets.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-6);

    return {
      labels: series.map(([label]) => label),
      revenue: series.map(([, value]) => value.revenue),
      expenses: series.map(([, value]) => value.expenses),
      profit: series.map(([, value]) => value.revenue - value.expenses)
    };
  }

  private lineChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            boxWidth: 8,
            usePointStyle: true,
            padding: 22,
            color: REPORT_THEME.muted
          }
        },
        tooltip: {
          backgroundColor: REPORT_THEME.text,
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: REPORT_THEME.muted }
        },
        y: {
          grid: { color: 'rgba(16,24,40,.08)' },
          ticks: { color: REPORT_THEME.muted }
        }
      }
    };
  }

  private barChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: REPORT_THEME.text,
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: REPORT_THEME.muted }
        },
        y: {
          grid: { color: 'rgba(16,24,40,.08)' },
          ticks: { color: REPORT_THEME.muted }
        }
      }
    };
  }

  private doughnutChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 8,
            usePointStyle: true,
            padding: 16,
            color: REPORT_THEME.muted
          }
        },
        tooltip: {
          backgroundColor: REPORT_THEME.text,
          padding: 12,
          cornerRadius: 10
        }
      }
    };
  }

  private writePdfLine(doc: jsPDF, text: string, y: number) {
    if (y > 278) {
      doc.addPage();
      y = this.drawPdfHeader(doc);
    }

    doc.text(text.slice(0, 118), 20, y);
    return y + 7;
  }

  private ensurePdfSpace(doc: jsPDF, y: number, neededHeight: number) {
    if (y + neededHeight > 278) {
      doc.addPage();
      return this.drawPdfHeader(doc);
    }

    return y;
  }

  private drawPdfSummaryCards(doc: jsPDF, y: number) {
    const cards = this.summaryCards.slice(0, 8);

    cards.forEach((card, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = column === 0 ? 20 : 108;
      const cardY = y + row * 20;

      if (cardY > 270) {
        doc.addPage();
        y = this.drawPdfHeader(doc);
      }

      doc.setDrawColor(REPORT_THEME.border);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, cardY, 78, 15, 3, 3, 'FD');
      doc.setTextColor(REPORT_THEME.muted);
      doc.setFontSize(7);
      doc.text(card.label, x + 4, cardY + 5);
      doc.setTextColor(this.getPdfToneColor(card.tone));
      doc.setFontSize(11);
      doc.text(String(card.value), x + 4, cardY + 11);
    });

    return y + Math.ceil(cards.length / 2) * 20 + 2;
  }

  private drawPdfFinancialBars(doc: jsPDF, y: number) {
    return this.drawPdfBarGroup(
      doc,
      y,
      [
        { label: 'Revenue', value: this.totalRevenue, color: REPORT_THEME.primary },
        { label: 'Expenses', value: this.totalExpenses, color: REPORT_THEME.warning },
        { label: 'Profit', value: this.totalRevenue - this.totalExpenses, color: (this.totalRevenue - this.totalExpenses) >= 0 ? REPORT_THEME.cloudBlue : REPORT_THEME.danger }
      ],
      true
    );
  }

  private drawPdfOperationsBars(doc: jsPDF, y: number) {
    if (!this.operationsDistribution.length) {
      return this.writePdfLine(doc, 'No operations data for the selected period.', y);
    }

    return this.drawPdfBarGroup(
      doc,
      y,
      this.operationsDistribution.map((item, index) => ({
        label: item.category,
        value: item.count,
        color: [REPORT_THEME.primary, REPORT_THEME.cloudBlue, REPORT_THEME.warning, REPORT_THEME.danger, REPORT_THEME.secondary][index % 5]
      })),
      false
    );
  }

  private drawPdfCropProfitBars(doc: jsPDF, y: number) {
    return this.drawPdfBarGroup(
      doc,
      y,
      this.profitByCropEntries.map(item => ({
        label: item.crop,
        value: item.profit,
        color: item.profit >= 0 ? REPORT_THEME.primary : REPORT_THEME.danger
      })),
      true
    );
  }

  private drawPdfBarGroup(
    doc: jsPDF,
    y: number,
    items: Array<{ label: string; value: number; color: string }>,
    currency: boolean
  ) {
    const maxValue = Math.max(...items.map(item => Math.abs(item.value)), 1);

    items.forEach(item => {
      if (y > 272) {
        doc.addPage();
        y = this.drawPdfHeader(doc);
      }

      const width = Math.max(4, (Math.abs(item.value) / maxValue) * 95);
      doc.setTextColor(REPORT_THEME.text);
      doc.setFontSize(8);
      doc.text(item.label.slice(0, 28), 20, y + 4);
      doc.setFillColor(item.color);
      doc.roundedRect(72, y, width, 5, 2, 2, 'F');
      doc.setTextColor(REPORT_THEME.muted);
      doc.text(currency ? this.formatCurrency(item.value) : String(item.value), 172, y + 4);
      y += 9;
    });

    return y;
  }

  private getPdfToneColor(tone: string) {
    if (tone === 'danger') {
      return REPORT_THEME.danger;
    }

    if (tone === 'warning') {
      return REPORT_THEME.warning;
    }

    return REPORT_THEME.primaryStrong;
  }

  private drawPdfHeader(doc: jsPDF) {
    return drawFarmOpsPdfHeader(
      doc,
      this.pdfLogoDataUrl,
      {
        title: 'Executive Reports',
        generatedLabel: `Generated: ${formatFarmOpsGeneratedDateTime()}`,
        periodLabel: this.getReportingPeriodLabel()
      }
    );
  }

  private getReportingPeriodLabel() {
    return `${this.periodLabel}: ${this.startDateLabel} - ${this.endDateLabel}`;
  }

  private normalizeSearch(value: any) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

}
