import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { Zone } from '../../services/zone';
import { Crop } from '../../services/crop';
import { FinancialRecord } from '../../services/financial-record';
import { OperationSignal } from '../../services/operation-signal';
import { WeatherInsights, WeatherService } from '../../services/weather';
import {
  LucideActivity,
  LucideBadgeDollarSign,
  LucideBell,
  LucideChartNoAxesCombined,
  LucideCloudSun,
  LucideDroplet,
  LucideLeaf,
  LucideReceipt,
  LucideSprout,
  LucideTrendingUp
} from '@lucide/angular';

Chart.register(...registerables);

declare const google: any;

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    LucideActivity,
    LucideBadgeDollarSign,
    LucideBell,
    LucideChartNoAxesCombined,
    LucideCloudSun,
    LucideDroplet,
    LucideLeaf,
    LucideReceipt,
    LucideSprout,
    LucideTrendingUp
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  farms: any[] = [];
  fields: any[] = [];
  zones: any[] = [];
  crops: any[] = [];
  records: any[] = [];
  recentRecords: any[] = [];
  weatherSummary: WeatherInsights | null = null;
  selectedWeatherFarm: any = null;
  weatherAlerts: Array<{
    priority: string;
    category: string;
    title: string;
    target: string;
    action: string;
    type: string;
  }> = [];
  operationSignals: any[] = [];
  weatherLoading = false;

  totalFarms = 0;
  totalFields = 0;
  totalZones = 0;
  totalCrops = 0;
  totalRecords = 0;
  totalRevenue = 0;
  totalExpenses = 0;
  netProfit = 0;
  averageHealthIndex = 0;
  averageNdviScore = 0;
  averageSoilMoisture = 0;
  activeCrops = 0;
  highPriorityRecommendations = 0;
  upcomingHarvests: any[] = [];
  seasonCounts = {
    Spring: 0,
    Summer: 0,
    Autumn: 0,
    Winter: 0
  };

  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private zoneService = inject(Zone);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private operationSignalService = inject(OperationSignal);
  private weatherService = inject(WeatherService);
  private mapsLoader = inject(GoogleMapsLoader);
  private cdr = inject(ChangeDetectorRef);

  private allFields: any[] = [];
  private allZones: any[] = [];
  private allCrops: any[] = [];
  private allRecords: any[] = [];

  get recentFarms() {
    return this.farms
      .slice()
      .reverse()
      .slice(0, 4);
  }

  get operationalSummary() {
    return [
      { label: 'Farms', value: this.totalFarms },
      { label: 'Fields', value: this.totalFields },
      { label: 'Zones', value: this.totalZones },
      { label: 'Crops', value: this.totalCrops }
    ];
  }

  get openAlerts() {
    return this.activeOperationSignals.length;
  }

  get activeOperationSignals() {
    return this.operationSignals.filter(signal => signal.status === 'Active');
  }

  get criticalHighOperationSignals() {
    return this.activeOperationSignals.filter(signal =>
      ['Critical', 'High'].includes(signal.priority)
    ).length;
  }

  get operationsAttentionList() {
    return this.activeOperationSignals.slice(0, 3);
  }

  get activeFields() {
    return this.fields.filter(field =>
      String(field.status || '').toLowerCase() === 'active'
    ).length;
  }

  get weatherRiskLabel() {
    if (this.weatherLoading) {
      return 'Checking';
    }

    return this.weatherAlerts.length ? 'Elevated' : 'Stable';
  }

  get selectedWeatherContext() {
    if (this.selectedWeatherFarm) {
      return `${this.selectedWeatherFarm.name}${this.selectedWeatherFarm.location ? ' | ' + this.selectedWeatherFarm.location : ''}`;
    }

    return 'No farm selected';
  }

  get hasFinancialHistory() {
    const datedBuckets =
      new Set(
        this.records
          .map(record => record.date)
          .filter(Boolean)
          .map(date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date)))
      );

    return datedBuckets.size > 0;
  }

  get profitMargin() {
    if (!this.totalRevenue) {
      return 0;
    }

    return Math.round((this.netProfit / this.totalRevenue) * 100);
  }

  get commandKpis() {
    return [
      {
        label: 'Total Revenue',
        value: this.totalRevenue,
        detail: `${this.totalRecords} financial records`,
        tone: 'revenue',
        icon: 'revenue',
        currency: true
      },
      {
        label: 'Net Profit',
        value: this.netProfit,
        detail: 'Revenue minus expenses',
        tone: 'profit',
        icon: 'profit',
        currency: true
      },
      {
        label: 'Total Costs',
        value: this.totalExpenses,
        detail: 'Tracked expenses',
        tone: 'expenses',
        icon: 'expenses',
        currency: true
      },
      {
        label: 'Active Fields',
        value: this.activeFields,
        detail: `${this.totalFields} total fields`,
        tone: 'fields',
        icon: 'fields'
      },
      {
        label: 'Avg Health',
        value: `${this.averageHealthIndex}%`,
        detail: 'Field/zone signal',
        tone: 'health',
        icon: 'health'
      },
      {
        label: 'Profit Margin',
        value: `${this.profitMargin}%`,
        detail: 'Net profit share of revenue',
        tone: 'profit',
        icon: 'profit'
      }
    ];
  }

  get topRecommendations() {
    const fieldRecommendations =
      this.fields
        .flatMap(field => {
          const alerts: any[] = [];
          const health =
            this.getFieldHealthIndex(field);
          const moisture =
            this.getFieldSoilMoisture(field);
          const ndvi =
            this.getFieldNdviScore(field);
          const irrigationStatus =
            String(field.irrigationStatus || '').toLowerCase();

          if (health !== null && health < 50) {
            alerts.push({
              priority: 'High',
              category: 'Health Alert',
              title: 'Low field health',
              target: field.name,
              action: `${field.name} needs inspection based on NDVI, moisture and irrigation signals.`,
              type: 'health'
            });
          }

          if (irrigationStatus.includes('dry') || irrigationStatus.includes('paused') || moisture < 40) {
            alerts.push({
              priority: 'Medium',
              category: 'Irrigation Alert',
              title: 'Irrigation needed',
              target: field.name,
              action: `${field.name} soil moisture is below the operating threshold.`,
              type: 'irrigation'
            });
          }

          if (ndvi < 50) {
            alerts.push({
              priority: 'High',
              category: 'NDVI Alert',
              title: 'Low vegetation score',
              target: field.name,
              action: `${field.name} NDVI score dropped below target.`,
              type: 'ndvi'
            });
          }

          return alerts;
        });

    const zoneRecommendations =
      this.zones
        .filter(zone =>
          Number(zone.healthScore || 0) < 50 ||
          Number(zone.moistureScore || 0) < 40 ||
          Number(zone.ndviScore || 0) < 50
        )
        .map(zone => ({
          priority: 'High',
          category: 'Zone Alert',
          target: zone.name,
          title: 'Zone intervention needed',
          action: zone.recommendation || 'Inspect this management zone and update localized treatment notes.',
          type: 'health'
        }));

    const weatherRecommendations =
      this.weatherAlerts;

    const lifecycleRecommendations =
      this.upcomingHarvests
        .filter(crop => {
          const harvestDate =
            crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).getTime() : 0;
          return harvestDate && harvestDate <= Date.now() + (7 * 86400000);
        })
        .map(crop => ({
          priority: 'Medium',
          category: 'Lifecycle Alert',
          target: this.getCropFieldName(crop),
          title: 'Harvest approaching',
          action: `${this.getCropFieldName(crop)} expected harvest is within 7 days.`,
          type: 'lifecycle'
        }));

    const recommendations = [
      ...fieldRecommendations,
      ...zoneRecommendations,
      ...weatherRecommendations,
      ...lifecycleRecommendations
    ];

    if (!recommendations.length && this.fields.length) {
      recommendations.push({
        priority: 'Low',
        category: 'Operational Status',
        target: 'FarmOps',
        title: 'No urgent action required',
        action: 'Field, weather and vegetation indicators are currently within normal ranges.',
        type: 'stable'
      });
    }

    return recommendations.slice(0, 4);
  }

  get cropStatusOverview() {
    const overview = [
      { label: 'Planning', count: 0, tone: 'planned' },
      { label: 'Growing', count: 0, tone: 'active' },
      { label: 'Ready to Harvest', count: 0, tone: 'ready' },
      { label: 'Harvested', count: 0, tone: 'harvested' }
    ];

    this.getFieldCropCycles().forEach(field => {
      const stage = this.getFieldLifecycleStage(field);
      const fieldStatus = String(field.status || '').toLowerCase();

      if (fieldStatus.includes('harvested') || stage === 'harvest') {
        overview[3].count++;
      } else if (stage === 'ripening') {
        overview[2].count++;
      } else if (stage === 'planning') {
        overview[0].count++;
      } else {
        overview[1].count++;
      }
    });

    return overview;
  }

  get irrigationStatusOverview() {
    const optimal = this.fields.filter(field => {
      const status = String(field.irrigationStatus || '').toLowerCase();
      return status.includes('irrigated') || status.includes('scheduled');
    }).length;

    const needs = this.fields.filter(field => {
      const status = String(field.irrigationStatus || '').toLowerCase();
      return status.includes('dry') || status.includes('paused');
    }).length;

    const monitoring = Math.max(this.totalFields - optimal - needs, 0);

    return [
      { label: 'Optimal', count: optimal, tone: 'active' },
      { label: 'Needs Irrigation', count: needs, tone: 'ready' },
      { label: 'Monitoring', count: monitoring, tone: 'planned' }
    ];
  }

  get topPerformingFields(): any[] {
    const financialFields =
      this.getFieldFinancialPerformance();

    if (financialFields.length) {
      return financialFields.slice(0, 3);
    }

    return this.fields
      .map(field => ({
        field,
        name: field.name,
        crop: this.getFieldCropLabel(field),
        area: field.area,
        score: this.getFieldPerformanceScore(field),
        profit: null,
        roi: null,
        financial: false
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
  }

  get recentActivities() {
    return this.recentRecords.slice(0, 4);
  }

  async ngOnInit(): Promise<void> {

    await this.mapsLoader.load();
    this.loadDashboardData();

  }

  loadDashboardData() {

    this.farmService.getFarms().subscribe({
      next: (data: any) => {
        this.farms = [...data];
        this.reconcileDashboardData();
        this.renderFarmMap();
        this.selectDefaultWeatherFarm();
        this.loadWeatherAlerts();
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });

    this.fieldService.getFields().subscribe({
      next: (data: any) => {
        this.allFields = [...data];
        this.reconcileDashboardData();
        this.renderFarmMap();
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });

    this.zoneService.getZones().subscribe({
      next: (data: any) => {
        this.allZones = [...data];
        this.reconcileDashboardData();
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });

    this.cropService.getCrops().subscribe({
      next: (data: any) => {
        this.allCrops = [...data];
        this.reconcileDashboardData();
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });

    this.financialService.getRecords().subscribe({
      next: (data: any) => {
        this.allRecords = [...data];
        this.reconcileDashboardData();
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });

    this.refreshOperationSignals();

  }

  private refreshOperationSignals() {
    this.operationSignalService.getActiveSignals().subscribe({
      next: (data: any) => {
        this.operationSignals = [...data].filter(signal => signal.status === 'Active');
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  private generateWeatherOperationSignals() {
    this.operationSignalService.evaluateWeatherSignals().subscribe({
      next: () => this.refreshOperationSignals(),
      error: (error) => console.error(error)
    });
  }

  get hasDashboardData() {
    return this.totalFarms > 0;
  }

  get hasCropDistributionData() {
    return this.hasProfitByCropData;
  }

  get hasProfitByCropData() {
    return this.getProfitByCropBreakdown().entries.length > 0;
  }

  get totalCropProfit() {
    return this.getProfitByCropBreakdown().totalProfit;
  }

  get hasIrrigationData() {
    return this.hasDashboardData && this.fields.length > 0;
  }

  getFieldCropLabel(field: any) {

    return field.crop?.name || field.cropType || 'Unassigned';

  }

  private reconcileDashboardData() {

    const validFarmIds =
      new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));

    this.totalFarms = this.farms.length;

    if (!validFarmIds.size) {
      this.fields = [];
      this.zones = [];
      this.crops = [];
      this.records = [];
      this.recentRecords = [];
      this.totalFields = 0;
      this.totalZones = 0;
      this.totalCrops = 0;
      this.totalRecords = 0;
      this.totalRevenue = 0;
      this.totalExpenses = 0;
      this.netProfit = 0;
      this.averageHealthIndex = 0;
      this.averageNdviScore = 0;
      this.averageSoilMoisture = 0;
      this.activeCrops = 0;
      this.highPriorityRecommendations = 0;
      this.upcomingHarvests = [];
      this.weatherSummary = null;
      this.selectedWeatherFarm = null;
      this.weatherAlerts = [];
      this.operationSignals = [];
      this.weatherLoading = false;
      return;
    }

    if (
      this.selectedWeatherFarm &&
      !validFarmIds.has(this.getEntityId(this.selectedWeatherFarm))
    ) {
      this.selectedWeatherFarm = null;
      this.weatherSummary = null;
    }

    this.fields =
      this.allFields.filter(field =>
        validFarmIds.has(this.getEntityId(field.farm))
      );

    const validFieldIds =
      new Set(this.fields.map(field => this.getEntityId(field)).filter(Boolean));

    this.zones =
      this.allZones.filter(zone =>
        validFieldIds.has(this.getEntityId(zone.field))
      );

    this.crops =
      this.allCrops.filter(crop =>
        validFarmIds.has(this.getEntityId(crop.farm))
      );

    this.records =
      this.allRecords.filter(record =>
        validFarmIds.has(this.getEntityId(record.farm))
      );

    this.totalFields = this.fields.length;
    this.totalZones = this.zones.length;
    this.totalCrops = this.getAssignedCropCount();
    this.totalRecords = this.records.length;
    this.recentRecords = this.records.slice().reverse().slice(0, 5);
    this.totalRevenue = this.sumRecordsByType('Income');
    this.totalExpenses = this.sumRecordsByType('Expense');
    this.netProfit = this.totalRevenue - this.totalExpenses;
    this.calculateOperationalMetrics();
    this.calculateCropMetrics();

  }

  private getEntityId(entity: any) {

    if (!entity) {
      return '';
    }

    return String(entity._id || entity);

  }

  formatArea(value: any) {

    const area = Number(value || 0);
    return Number.isFinite(area) ? area.toFixed(2) : '0.00';

  }

  getFieldHealthIndex(field: any) {

    if (!this.canCalculateCropHealth(field)) {
      return null;
    }

    let health =
      this.getFieldNdviScore(field);
    const moisture =
      this.getFieldSoilMoisture(field);
    const irrigationStatus =
      String(field?.irrigationStatus || '').toLowerCase();

    if (moisture < 30) {
      health -= 20;
    } else if (moisture <= 50) {
      health -= 10;
    }

    if (irrigationStatus.includes('dry')) {
      health -= 15;
    }

    return this.clampHealthScore(health);

  }

  getFieldSoilMoisture(field: any) {

    const explicitMoisture =
      Number(field?.soilMoisture ?? field?.moistureScore);

    if (Number.isFinite(explicitMoisture) && explicitMoisture > 0) {
      return this.clampHealthScore(explicitMoisture);
    }

    const normalized =
      String(field?.irrigationStatus || '').toLowerCase();

    if (normalized.includes('dry')) {
      return 38;
    }

    if (normalized.includes('irrigated')) {
      return 84;
    }

    return 68;

  }

  getFieldNdviScore(field: any) {

    return this.getFieldManualNdviScore(field);

  }

  getFieldManualNdviScore(field: any) {

    const explicitNdvi =
      Number(field?.ndviScore ?? field?.ndvi ?? field?.vegetationScore);

    if (Number.isFinite(explicitNdvi) && explicitNdvi > 0) {
      return this.clampHealthScore(explicitNdvi);
    }

    const normalized =
      String(field?.healthStatus || '').toLowerCase();

    if (normalized.includes('critical') || normalized.includes('poor')) {
      return 28;
    }

    if (
      normalized.includes('watch') ||
      normalized.includes('fair') ||
      normalized.includes('warning') ||
      normalized.includes('moderate')
    ) {
      return 55;
    }

    return 91;

  }

  fieldHasCrop(field: any) {

    return Boolean(field?.crop?._id || field?.crop || field?.cropType);

  }

  canCalculateCropHealth(field: any) {

    const status =
      String(field?.status || '').toLowerCase();

    return this.fieldHasCrop(field) &&
      !status.includes('resting') &&
      !status.includes('harvested');

  }

  clampHealthScore(value: number) {

    return Math.max(0, Math.min(100, Math.round(value)));

  }

  getWeatherAlertIcon(type: string) {
    switch (type) {
      case 'weather':
        return 'weather';
      case 'irrigation':
        return 'irrigation';
      case 'ndvi':
      case 'health':
        return 'health';
      case 'lifecycle':
        return 'crop';
      default:
        return 'alert';
    }
  }

  getOperationItemType(item: any) {
    if (item.type) {
      return item.type;
    }

    switch (item.category) {
      case 'Weather':
        return 'weather';
      case 'Irrigation':
        return 'irrigation';
      case 'NDVI':
        return 'ndvi';
      case 'Crop Lifecycle':
        return 'crop';
      case 'Financial':
        return 'financial';
      default:
        return 'alert';
    }
  }

  getOperationItemTarget(item: any) {
    if (item.target) {
      return item.target;
    }

    const farmName =
      item.farm?.name ||
      (item.category === 'Financial' ? 'Global financial signal' : 'FarmOps');
    const fieldName =
      item.field?.name;

    return fieldName
      ? `${farmName} | ${fieldName}`
      : farmName;
  }

  getOperationItemAction(item: any) {
    return item.recommendedAction || item.action || item.description || '';
  }

  getOperationItemCategory(item: any) {
    return item.category || 'Operational Signal';
  }

  getRecommendationPriority(field: any) {

    const health =
      this.getFieldHealthIndex(field);
    const moisture =
      this.getFieldSoilMoisture(field);
    const ndvi =
      this.getFieldNdviScore(field);

    return (health !== null && health < 50) || ndvi < 50 || moisture < 40 ? 'High' : 'Low';

  }

  getFieldStatusTone(field: any) {

    return this.getRecommendationPriority(field) === 'High'
      ? 'risk-high'
      : 'risk-low';

  }

  getFieldPerformanceScore(field: any) {
    const health =
      this.getFieldHealthIndex(field) ?? 0;

    return Math.round(
      (
        health +
        this.getFieldSoilMoisture(field) +
        this.getFieldNdviScore(field)
      ) / 3
    );
  }

  getUpcomingHarvestDate(crop: any) {

    return crop.expectedHarvestDate || null;

  }

  getCropFieldName(crop: any) {

    if (crop?.fieldName) {
      return crop.fieldName;
    }

    const field =
      this.fields.find(item =>
        (item.crop?._id || item.crop) === crop._id
      );

    return field?.name || 'Unassigned field';

  }

  private calculateOperationalMetrics() {

    const fieldHealth =
      this.fields
        .map(field => this.getFieldHealthIndex(field))
        .filter((value): value is number => value !== null);
    const fieldMoisture =
      this.fields.map(field => this.getFieldSoilMoisture(field));
    const fieldNdvi =
      this.fields.map(field => this.getFieldNdviScore(field));
    const zoneHealth =
      this.zones.map(zone => Number(zone.healthScore || 0)).filter(Boolean);
    const zoneMoisture =
      this.zones.map(zone => Number(zone.moistureScore || 0)).filter(Boolean);
    const zoneNdvi =
      this.zones.map(zone => Number(zone.ndviScore || 0)).filter(Boolean);

    this.averageHealthIndex =
      this.average([...fieldHealth, ...zoneHealth]);
    this.averageSoilMoisture =
      this.average(zoneMoisture.length ? zoneMoisture : fieldMoisture);
    this.averageNdviScore =
      this.average(zoneNdvi.length ? zoneNdvi : fieldNdvi);
    this.highPriorityRecommendations =
      this.fields.filter(field => this.getRecommendationPriority(field) === 'High').length +
      this.zones.filter(zone =>
        Number(zone.healthScore || 0) < 50 ||
        Number(zone.moistureScore || 0) < 40 ||
        Number(zone.ndviScore || 0) < 50
      ).length;

  }

  private calculateCropMetrics() {

    this.seasonCounts = {
      Spring: 0,
      Summer: 0,
      Autumn: 0,
      Winter: 0
    };

    this.getFieldCropCycles().forEach((field: any) => {
      const crop =
        this.getFieldCrop(field);

      if (this.seasonCounts.hasOwnProperty(crop.season)) {
        this.seasonCounts[crop.season as keyof typeof this.seasonCounts]++;
      }
    });

    this.activeCrops =
      this.getFieldCropCycles()
        .filter(field => {
          const status =
            String(field.status || '').toLowerCase();
          const stage =
            this.getFieldLifecycleStage(field);

          return !status.includes('harvested') && stage !== 'harvest';
        })
        .length;

    const now =
      Date.now();
    const nextWindow =
      now + (45 * 86400000);

    this.upcomingHarvests = this.getFieldCropCycles()
      .map(field => ({
        ...this.getFieldCrop(field),
        field,
        fieldName: field.name,
        name: this.getFieldCropLabel(field)
      }))
      .filter(crop => {
        const harvestDate =
          crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).getTime() : 0;
        return harvestDate >= now && harvestDate <= nextWindow;
      })
      .sort((a, b) =>
        new Date(a.expectedHarvestDate).getTime() -
        new Date(b.expectedHarvestDate).getTime()
      )
      .slice(0, 5);

  }

  private getFieldCropCycles() {

    return this.fields.filter(field =>
      this.fieldHasCrop(field) &&
      !String(field.status || '').toLowerCase().includes('resting')
    );

  }

  private getFieldCrop(field: any) {

    if (field?.crop && typeof field.crop === 'object') {
      return field.crop;
    }

    const cropId =
      this.getEntityId(field?.crop);

    return this.crops.find(crop => this.getEntityId(crop) === cropId) || {};

  }

  private getFieldLifecycleStage(field: any) {

    const crop =
      this.getFieldCrop(field);

    return String(
      field?.currentStage ||
      field?.cropStage ||
      crop?.currentStage ||
      'Planning'
    ).toLowerCase();

  }

  private getAssignedCropCount() {

    const assigned =
      new Set<string>();

    this.getFieldCropCycles().forEach(field => {
      const crop =
        this.getFieldCrop(field);
      const cropId =
        this.getEntityId(field.crop) || this.getEntityId(crop);
      const cropName =
        this.getFieldCropLabel(field).trim().toLowerCase();
      const cropType =
        String(crop?.type || '').trim().toLowerCase();

      if (cropName && cropName !== 'unassigned') {
        assigned.add(`name:${cropName}|${cropType}`);
      } else if (cropId) {
        assigned.add(`id:${cropId}`);
      }
    });

    return assigned.size;

  }

  private average(values: number[]) {

    if (!values.length) {
      return 0;
    }

    const total =
      values.reduce((sum, value) => sum + Number(value || 0), 0);

    return Math.round(total / values.length);

  }

  private sumRecordsByType(type: string) {

    return this.records
      .filter(record => record.type === type)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);

  }

  private selectDefaultWeatherFarm() {

    const firstFarmWithCoordinates =
      this.farms.find(farm => farm.latitude && farm.longitude);

    if (firstFarmWithCoordinates && !this.selectedWeatherFarm) {
      this.selectDashboardFarmWeather(firstFarmWithCoordinates);
    }

  }

  selectDashboardFarmWeather(farm: any) {

    if (!farm?.latitude || !farm?.longitude) {
      return;
    }

    this.selectedWeatherFarm = farm;
    this.weatherLoading = true;

    this.weatherService
      .getWeather(Number(farm.latitude), Number(farm.longitude))
      .subscribe({
        next: (weather: WeatherInsights) => {
          this.weatherSummary = weather;
          this.weatherLoading = false;
          this.generateWeatherOperationSignals();
          this.cdr.detectChanges();
        },
        error: () => {
          this.weatherLoading = false;
          this.cdr.detectChanges();
        }
      });

  }

  private loadWeatherAlerts() {

    const farmsWithCoordinates =
      this.farms
        .filter(farm => farm.latitude && farm.longitude)
        .slice(0, 5);

    this.weatherAlerts = [];

    if (!farmsWithCoordinates.length) {
      return;
    }

    farmsWithCoordinates.forEach(farm => {
      this.weatherService
        .getWeather(Number(farm.latitude), Number(farm.longitude))
        .subscribe({
          next: (weather: WeatherInsights) => {
            if (weather.rainProbability > 70) {
              this.weatherAlerts.push({
                priority: 'Medium',
                category: 'Weather Alert',
                title: 'Rain likely',
                target: farm.name,
                action: `${weather.rainProbability}% rain probability near ${farm.name}. Consider delaying irrigation.`,
                type: 'weather'
              });
            }

            if (weather.temperature > 32) {
              this.weatherAlerts.push({
                priority: 'Medium',
                category: 'Weather Alert',
                title: 'High temperature',
                target: farm.name,
                action: `${weather.temperature}°C near ${farm.name}. Monitor crop stress and water demand.`,
                type: 'weather'
              });
            }

            if (weather.windSpeed > 30) {
              this.weatherAlerts.push({
                priority: 'Medium',
                category: 'Weather Alert',
                title: 'High wind',
                target: farm.name,
                action: `${weather.windSpeed} km/h wind near ${farm.name} may affect spraying operations.`,
                type: 'weather'
              });
            }

            this.cdr.detectChanges();
          },
          error: () => {
            this.cdr.detectChanges();
          }
        });
    });

  }

  private renderChartsSoon() {

    setTimeout(() => {
      this.renderRevenueCostsChart();
      this.renderProfitByCropChart();
      this.renderIrrigationChart();
    }, 200);

  }

  private renderFarmMap() {

    setTimeout(() => {
      const mapElement =
        document.getElementById('all-farms-map');

      if (!mapElement || typeof google === 'undefined') {
        return;
      }

      const map = new google.maps.Map(
        mapElement,
        {
          zoom: 5,
          mapTypeId: 'hybrid',
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          center: {
            lat: 4.5709,
            lng: -74.2973
          }
        }
      );

      const bounds =
        new google.maps.LatLngBounds();
      let mappedFarmCount = 0;

      this.farms.forEach(farm => {
        if (!farm.latitude || !farm.longitude) {
          return;
        }

        const position = {
          lat: Number(farm.latitude),
          lng: Number(farm.longitude)
        };

        const marker = new google.maps.Marker({
          position,
          map,
          title: farm.name
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <h3>${farm.name}</h3>
            <p>${farm.location || 'Location not specified'}</p>
            <p>Size: ${this.formatArea(farm.size)} ha</p>
          `
        });

        marker.addListener('click', () => {
          this.selectDashboardFarmWeather(farm);
          infoWindow.open(map, marker);
        });

        if (farm.polygonCoordinates?.length) {
          new google.maps.Polygon({
            paths: farm.polygonCoordinates,
            fillColor: '#16a34a',
            fillOpacity: .18,
            strokeColor: '#bbf7d0',
            strokeOpacity: .95,
            strokeWeight: 2,
            clickable: false,
            map
          });
        }

        bounds.extend(position);
        mappedFarmCount++;
      });

      if (mappedFarmCount > 0) {
        map.fitBounds(bounds);
      }
    }, 300);

  }

  private renderRevenueCostsChart() {

    const canvas =
      document.getElementById('revenueCostsChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasFinancialHistory) {
      return;
    }

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: this.getFinancialSeries().labels,
        datasets: [
          {
            label: 'Revenue',
            data: this.getFinancialSeries().income,
            borderColor: '#14915f',
            backgroundColor: 'rgba(20,145,95,.12)',
            tension: .35,
            fill: true
          },
          {
            label: 'Costs',
            data: this.getFinancialSeries().expenses,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,.1)',
            tension: .35,
            fill: true
          }
        ]
      },
      options: this.getLineChartOptions()
    });

  }

  private renderProfitByCropChart() {

    const canvas =
      document.getElementById('cropDistributionChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasProfitByCropData) {
      return;
    }

    const profitByCrop =
      this.getProfitByCropBreakdown();

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: profitByCrop.entries.map(item => item.crop),
        datasets: [
          {
            backgroundColor: ['#14915f', '#4f83a8', '#f59e0b', '#79ad32', '#8b5cf6'],
            borderColor: '#ffffff',
            borderWidth: 4,
            data: profitByCrop.entries.map(item => Math.abs(item.profit))
          }
        ]
      },
      options: this.getProfitDoughnutChartOptions()
    });

  }

  private renderIrrigationChart() {

    const canvas =
      document.getElementById('irrigationChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: this.irrigationStatusOverview.map(item => item.label),
        datasets: [
          {
            backgroundColor: ['#14915f', '#f59e0b', '#4f83a8'],
            borderColor: '#ffffff',
            borderWidth: 4,
            data: this.irrigationStatusOverview.map(item => item.count)
          }
        ]
      },
      options: this.getDoughnutChartOptions()
    });

  }

  private getFinancialSeries() {

    const buckets = new Map<string, { income: number; expenses: number; timestamp: number }>();

    this.records.forEach(record => {
      const date =
        record.date;

      if (!date) {
        return;
      }

      const timestamp =
        new Date(date).getTime();

      if (!Number.isFinite(timestamp)) {
        return;
      }

      const label =
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date));

      if (!buckets.has(label)) {
        buckets.set(label, { income: 0, expenses: 0, timestamp });
      }

      const bucket = buckets.get(label)!;

      if (record.type === 'Income') {
        bucket.income += Number(record.amount || 0);
      }

      if (record.type === 'Expense') {
        bucket.expenses += Number(record.amount || 0);
      }
    });

    const series = Array.from(buckets.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(-7);

    return {
      labels: series.map(([label]) => label),
      income: series.map(([, value]) => value.income),
      expenses: series.map(([, value]) => value.expenses)
    };

  }

  getProfitByCropBreakdown() {

    const validCropIds =
      new Set(this.crops.map(crop => this.getEntityId(crop)).filter(Boolean));
    const buckets =
      new Map<string, { income: number; expenses: number; crop: string }>();

    this.records
      .filter(record => validCropIds.has(this.getEntityId(record.crop)))
      .forEach(record => {
        const cropId =
          this.getEntityId(record.crop);
        const cropName =
          record.crop?.name ||
          this.crops.find(crop => this.getEntityId(crop) === cropId)?.name ||
          'Unavailable crop';

        if (!buckets.has(cropId)) {
          buckets.set(cropId, { income: 0, expenses: 0, crop: cropName });
        }

        const bucket =
          buckets.get(cropId)!;

        if (record.type === 'Income') {
          bucket.income += Number(record.amount || 0);
        }

        if (record.type === 'Expense') {
          bucket.expenses += Number(record.amount || 0);
        }
      });

    const entries =
      Array.from(buckets.values())
        .map(bucket => ({
          crop: bucket.crop,
          profit: bucket.income - bucket.expenses
        }))
        .filter(item => item.profit !== 0)
        .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
        .slice(0, 5);

    const totalProfit =
      entries.reduce((sum, item) => sum + item.profit, 0);
    const absoluteTotal =
      entries.reduce((sum, item) => sum + Math.abs(item.profit), 0);

    return {
      entries: entries.map(item => ({
        ...item,
        percent: absoluteTotal
          ? Math.round((Math.abs(item.profit) / absoluteTotal) * 100)
          : 0
      })),
      totalProfit
    };

  }

  private getFieldFinancialPerformance() {
    const validFieldIds =
      new Set(this.fields.map(field => this.getEntityId(field)).filter(Boolean));
    const buckets =
      new Map<string, { income: number; expenses: number; field: any }>();

    this.records
      .filter(record => validFieldIds.has(this.getEntityId(record.field)))
      .forEach(record => {
        const fieldId =
          this.getEntityId(record.field);
        const field =
          this.fields.find(item => this.getEntityId(item) === fieldId) || record.field;

        if (!buckets.has(fieldId)) {
          buckets.set(fieldId, { income: 0, expenses: 0, field });
        }

        const bucket =
          buckets.get(fieldId)!;

        if (record.type === 'Income') {
          bucket.income += Number(record.amount || 0);
        }

        if (record.type === 'Expense') {
          bucket.expenses += Number(record.amount || 0);
        }
      });

    return Array.from(buckets.values())
      .map(bucket => {
        const profit =
          bucket.income - bucket.expenses;
        const roi =
          bucket.income
            ? Math.round((profit / bucket.income) * 100)
            : 0;

        return {
          field: bucket.field,
          name: bucket.field?.name || 'Unavailable field',
          crop: this.getFieldCropLabel(bucket.field),
          area: bucket.field?.area,
          profit,
          roi,
          score: null,
          financial: true
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }

  private getLineChartOptions(): any {

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 22,
            color: '#53645a'
          }
        },
        tooltip: {
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#53645a'
          }
        },
        y: {
          beginAtZero: true,
          border: {
            display: false
          },
          grid: {
            color: '#e4ece1'
          },
          ticks: {
            color: '#7a897f'
          }
        }
      }
    };

  }

  private getDoughnutChartOptions(): any {

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 18,
            color: '#53645a'
          }
        },
        tooltip: {
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 8
        }
      }
    };

  }

  private getProfitDoughnutChartOptions(): any {

    return {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      cutout: '68%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 8
        }
      }
    };

  }

  private getBarChartOptions(max?: number): any {

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#53645a',
            font: {
              weight: 700
            }
          }
        },
        y: {
          beginAtZero: true,
          max,
          border: {
            display: false
          },
          grid: {
            color: '#e4ece1'
          },
          ticks: {
            color: '#7a897f'
          }
        }
      }
    };

  }

}
