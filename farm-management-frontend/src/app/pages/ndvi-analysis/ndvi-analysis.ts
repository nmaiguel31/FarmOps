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
import { Chart, registerables } from 'chart.js';
import {
  LucideActivity,
  LucideBarChart3,
  LucideCheckCircle2,
  LucideExternalLink,
  LucideLeaf,
  LucideLineChart
} from '@lucide/angular';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { OperationSignal } from '../../services/operation-signal';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';

type NdviClass =
  'Excellent' |
  'Good' |
  'Moderate' |
  'Poor' |
  'Critical';

type FieldNdviView = {
  field: any;
  name: string;
  crop: string;
  ndvi: number;
  ndviPercent: number;
  classification: NdviClass;
  trend: 'Improving' | 'Stable' | 'Declining';
  healthIndex: number;
};

Chart.register(...registerables);

@Component({
  selector: 'app-ndvi-analysis',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideActivity,
    LucideBarChart3,
    LucideCheckCircle2,
    LucideExternalLink,
    LucideLeaf,
    LucideLineChart,
    EmptyStateComponent
  ],
  templateUrl: './ndvi-analysis.html',
  styleUrl: './ndvi-analysis.css'
})
export class NdviAnalysis implements OnInit, OnDestroy {

  farms: any[] = [];
  fields: any[] = [];
  selectedFarmId = '';
  selectedFarm: any = null;
  loading = true;
  error = '';
  ndviSignals: any[] = [];
  signalLoading = false;
  fieldSearch = '';

  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private operationSignalService = inject(OperationSignal);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routeSubscription?: Subscription;
  private dataRequestInFlight = false;
  private hasLoadedData = false;

  ngOnInit(): void {
    this.initializePage();
    this.routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects.startsWith('/ndvi')) {
          this.initializePage();
        }
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    Chart.getChart('ndviTrendChart')?.destroy();
  }

  initializePage() {
    if (this.dataRequestInFlight) {
      return;
    }

    if (this.hasLoadedData) {
      this.selectFarm(false);
      return;
    }

    queueMicrotask(() => this.loadData());
  }

  loadData() {
    if (this.dataRequestInFlight) {
      return;
    }

    this.dataRequestInFlight = true;
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.farmService.getFarms().subscribe({
      next: (farms: any) => {
        this.farms = Array.isArray(farms) ? [...farms] : [];
        this.fieldService.getFields().subscribe({
          next: (fields: any) => {
            this.fields = Array.isArray(fields) ? [...fields] : [];
            this.loading = false;
            this.dataRequestInFlight = false;
            this.hasLoadedData = true;
            this.selectedFarmId = this.selectedFarmId ||
              this.farms[0]?._id ||
              '';
            this.selectFarm(false);
            this.refreshNdviSignals();
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error(error);
            this.fields = [];
            this.loading = false;
            this.dataRequestInFlight = false;
            this.error = 'Unable to load fields for NDVI analysis.';
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error(error);
        this.farms = [];
        this.loading = false;
        this.dataRequestInFlight = false;
        this.error = 'Unable to load farms for NDVI analysis.';
        this.cdr.detectChanges();
      }
    });
  }

  selectFarm(refreshSignals = true) {
    this.selectedFarm =
      this.farms.find(farm => farm._id === this.selectedFarmId) || null;

    this.cdr.detectChanges();
    setTimeout(() => this.renderTrendChart());

    if (refreshSignals) {
      this.refreshNdviSignals();
    }
  }

  refreshNdviSignals() {
    if (!this.selectedFarm) {
      this.ndviSignals = [];
      return;
    }

    this.signalLoading = true;
    this.cdr.detectChanges();

    this.operationSignalService.evaluateNDVISignals().subscribe({
      next: () => this.loadRelatedNdviSignals(),
      error: (error) => {
        console.error(error);
        this.loadRelatedNdviSignals();
      }
    });
  }

  loadRelatedNdviSignals() {
    if (!this.selectedFarm) {
      this.signalLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.operationSignalService.getSignals({
      status: 'Active',
      category: 'NDVI',
      farm: this.selectedFarm._id
    }).subscribe({
      next: (signals: any) => {
        this.ndviSignals = Array.isArray(signals) ? [...signals] : [];
        this.signalLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.ndviSignals = [];
        this.signalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get selectedFarmFields() {
    if (!this.selectedFarm) {
      return [];
    }

    return this.fields.filter(field =>
      this.getEntityId(field.farm) === this.selectedFarm._id
    );
  }

  get rankedFields(): FieldNdviView[] {
    return this.selectedFarmFields
      .map(field => this.buildFieldNdviView(field))
      .sort((a, b) => b.ndvi - a.ndvi);
  }

  get filteredRankedFields(): FieldNdviView[] {
    const search =
      this.normalizeSearch(this.fieldSearch);

    if (!search) {
      return this.rankedFields;
    }

    return this.rankedFields.filter(field =>
      [
        field.name,
        field.crop,
        field.classification,
        field.trend,
        field.field?.status,
        field.field?.irrigationStatus,
        field.field?.healthStatus
      ]
        .some(value => this.normalizeSearch(value).includes(search))
    );
  }

  clearFilters() {
    this.fieldSearch = '';
  }

  get averageNdvi() {
    const values = this.rankedFields.map(field => field.ndvi);

    if (!values.length) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  get averageNdviPercent() {
    return Math.round(this.averageNdvi * 100);
  }

  get vegetationClassification(): NdviClass | 'Not available' {
    if (!this.rankedFields.length) {
      return 'Not available';
    }

    return this.classifyNdvi(this.averageNdvi);
  }

  get overallHealthStatus() {
    const classification = this.vegetationClassification;

    if (classification === 'Excellent' || classification === 'Good') {
      return 'Healthy';
    }

    if (classification === 'Moderate') {
      return 'Watch';
    }

    if (classification === 'Poor' || classification === 'Critical') {
      return 'At Risk';
    }

    return 'Not available';
  }

  get healthyFields() {
    return this.rankedFields.filter(field =>
      ['Excellent', 'Good'].includes(field.classification)
    ).length;
  }

  get atRiskFields() {
    return this.rankedFields.filter(field =>
      ['Poor', 'Critical'].includes(field.classification)
    ).length;
  }

  get aiInterpretation() {
    const classification = this.vegetationClassification;
    const decliningFields =
      this.rankedFields.filter(field => field.trend === 'Declining').length;

    if (classification === 'Critical') {
      return 'Critical vegetation decline detected.';
    }

    if (classification === 'Poor' || decliningFields > 1) {
      return 'Signs of moderate crop stress detected.';
    }

    if (
      classification === 'Excellent' ||
      this.rankedFields.some(field => field.trend === 'Improving')
    ) {
      return 'Vegetation recovery observed.';
    }

    return 'Vegetation health remains stable.';
  }

  get recommendations() {
    const classification = this.vegetationClassification;
    const recommendations = new Set<string>();

    if (classification === 'Excellent' || classification === 'Good') {
      recommendations.add('Continue current irrigation schedule.');
    }

    if (classification === 'Moderate') {
      recommendations.add('Review fertilizer application and inspect crop canopy density.');
      recommendations.add('Monitor soil moisture before the next irrigation cycle.');
    }

    if (classification === 'Poor') {
      recommendations.add('Inspect field for pests or nutrient stress.');
      recommendations.add('Increase irrigation frequency if soil moisture is low.');
    }

    if (classification === 'Critical') {
      recommendations.add('Prioritize immediate field inspection.');
      recommendations.add('Review irrigation, pest, and fertilizer records.');
    }

    this.rankedFields
      .filter(field => field.trend === 'Declining')
      .forEach(field => recommendations.add(`Inspect ${field.name} because its simulated NDVI trend is declining.`));

    if (!recommendations.size) {
      recommendations.add('Create fields with health information to generate recommendations.');
    }

    return Array.from(recommendations);
  }

  buildFieldNdviView(field: any): FieldNdviView {
    const ndvi = this.getFieldNdvi(field);
    const classification = this.classifyNdvi(ndvi);
    const trend = this.getFieldTrend(field, ndvi);

    return {
      field,
      name: field.name || 'Unnamed field',
      crop: field.crop?.name || field.cropType || 'No crop assigned',
      ndvi,
      ndviPercent: Math.round(ndvi * 100),
      classification,
      trend,
      healthIndex: this.getHealthIndex(field)
    };
  }

  getFieldNdvi(field: any) {
    const savedNdvi = Number(field.ndviScore);

    if (Number.isFinite(savedNdvi) && savedNdvi > 0) {
      return this.clamp(savedNdvi > 1 ? savedNdvi / 100 : savedNdvi, 0.2, 0.95);
    }

    const healthIndex = this.getHealthIndex(field);
    const base =
      healthIndex >= 90 ? 0.88 :
      healthIndex >= 75 ? 0.76 :
      healthIndex >= 60 ? 0.63 :
      healthIndex >= 40 ? 0.48 :
      0.3;
    const variation = this.getStableVariation(field, 0.035);

    return this.clamp(base + variation, 0.2, 0.95);
  }

  getHealthIndex(field: any) {
    const healthIndex = Number(field.healthIndex);

    if (Number.isFinite(healthIndex) && healthIndex > 0) {
      return this.clamp(healthIndex, 0, 100);
    }

    const status = String(field.healthStatus || '').toLowerCase();

    if (status.includes('critical')) {
      return 32;
    }

    if (status.includes('warning') || status.includes('fair')) {
      return 55;
    }

    if (status.includes('moderate')) {
      return 68;
    }

    return 82;
  }

  classifyNdvi(ndvi: number): NdviClass {
    if (ndvi >= 0.82) {
      return 'Excellent';
    }

    if (ndvi >= 0.7) {
      return 'Good';
    }

    if (ndvi >= 0.55) {
      return 'Moderate';
    }

    if (ndvi >= 0.4) {
      return 'Poor';
    }

    return 'Critical';
  }

  getFieldTrend(field: any, ndvi: number): 'Improving' | 'Stable' | 'Declining' {
    const history = Array.isArray(field.ndviHistory)
      ? field.ndviHistory.filter((item: any) => Number.isFinite(Number(item.value)))
      : [];

    if (history.length >= 2) {
      const previous = Number(history[history.length - 2].value);
      const normalizedPrevious = previous > 1 ? previous / 100 : previous;

      if (ndvi - normalizedPrevious > 0.03) {
        return 'Improving';
      }

      if (normalizedPrevious - ndvi > 0.03) {
        return 'Declining';
      }
    }

    const variation = this.getStableVariation(field, 1);

    if (variation > 0.35) {
      return 'Improving';
    }

    if (variation < -0.35) {
      return 'Declining';
    }

    return 'Stable';
  }

  getTrendSeries() {
    const fields = this.rankedFields;
    const base = fields.length
      ? this.averageNdvi
      : 0;
    const labels: string[] = [];
    const values: number[] = [];

    for (let index = 29; index >= 0; index--) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      labels.push(date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }));

      const wave = Math.sin((30 - index) / 4) * 0.018;
      const drift = fields.length
        ? fields.reduce((sum, item) => {
          const direction =
            item.trend === 'Improving' ? 1 :
            item.trend === 'Declining' ? -1 :
            0;
          return sum + direction;
        }, 0) / fields.length * ((30 - index) / 30) * 0.035
        : 0;
      const stableNoise = this.getStableVariation({
        _id: `${this.selectedFarmId}-${index}`
      }, 0.012);

      values.push(Number(this.clamp(base - drift + wave + stableNoise, 0.2, 0.95).toFixed(3)));
    }

    return { labels, values };
  }

  renderTrendChart() {
    const canvas =
      document.getElementById('ndviTrendChart') as HTMLCanvasElement | null;

    if (!canvas || !this.rankedFields.length) {
      Chart.getChart('ndviTrendChart')?.destroy();
      return;
    }

    const { labels, values } = this.getTrendSeries();
    Chart.getChart(canvas)?.destroy();

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Simulated NDVI',
            data: values,
            borderColor: '#14915f',
            backgroundColor: 'rgba(20, 145, 95, 0.14)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            min: 0.2,
            max: 1,
            ticks: {
              callback: value => Number(value).toFixed(2)
            },
            grid: {
              color: 'rgba(83, 100, 90, 0.12)'
            }
          },
          x: {
            ticks: {
              maxTicksLimit: 6
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  getClassTone(classification: string) {
    return classification.toLowerCase().replace(/\s+/g, '-');
  }

  getEntityId(entity: any) {
    return String(entity?._id || entity || '');
  }

  private normalizeSearch(value: any) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getStableVariation(field: any, range: number) {
    const seed = String(field?._id || field?.name || 'field');
    let hash = 0;

    for (let index = 0; index < seed.length; index++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(index);
      hash |= 0;
    }

    const normalized = ((Math.abs(hash) % 1000) / 1000) - 0.5;
    return normalized * range * 2;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

}
