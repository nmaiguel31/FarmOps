import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
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
import { forkJoin } from 'rxjs';
import { Crop } from '../../services/crop';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { FinancialRecord } from '../../services/financial-record';
import { OperationSignal } from '../../services/operation-signal';
import { Zone } from '../../services/zone';

Chart.register(...registerables);

@Component({
  selector: 'app-executive-reports',
  imports: [
    CommonModule,
    LucideActivity,
    LucideBadgeDollarSign,
    LucideBarChart3,
    LucideCloudSun,
    LucideDownload,
    LucideFileText,
    LucideLeaf,
    LucideShieldAlert,
    LucideSprout
  ],
  templateUrl: './executive-reports.html',
  styleUrl: './executive-reports.css'
})
export class ExecutiveReports implements OnInit, OnDestroy {

  farms: any[] = [];
  fields: any[] = [];
  zones: any[] = [];
  crops: any[] = [];
  records: any[] = [];
  signals: any[] = [];
  loading = true;
  loadError = '';

  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private zoneService = inject(Zone);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private operationSignalService = inject(OperationSignal);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadReportData();
  }

  ngOnDestroy(): void {
    Chart.getChart('executiveFinancialTrendChart')?.destroy();
    Chart.getChart('executiveFinancialSummaryChart')?.destroy();
  }

  loadReportData() {
    this.loading = true;
    this.loadError = '';

    forkJoin({
      farms: this.farmService.getFarms(),
      fields: this.fieldService.getFields(),
      zones: this.zoneService.getZones(),
      crops: this.cropService.getCrops(),
      records: this.financialService.getRecords(),
      signals: this.operationSignalService.getSignals({ status: 'All' })
    }).subscribe({
      next: (data: any) => {
        this.farms = [...(data.farms || [])];
        this.fields = this.filterFieldsByCurrentFarms(data.fields || []);
        this.zones = this.filterZonesByCurrentFields(data.zones || []);
        this.records = this.filterRecordsByCurrentFarms(data.records || []);
        this.crops = this.filterCropsByCurrentContext(data.crops || []);
        this.signals = [...(data.signals || [])];
        this.loading = false;
        this.cdr.detectChanges();
        this.renderChartsSoon();
      },
      error: (error) => {
        console.error(error);
        this.loadError = 'Unable to load executive report data.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get hasOperationalData() {
    return this.farms.length > 0;
  }

  get activeSignals() {
    return this.signals.filter(signal => signal.status === 'Active');
  }

  get resolvedSignals() {
    return this.signals.filter(signal => signal.status === 'Resolved');
  }

  get totalRevenue() {
    return this.sumRecords('Income');
  }

  get totalExpenses() {
    return this.sumRecords('Expense');
  }

  get monthlyProfit() {
    const now = new Date();
    return this.records
      .filter(record => {
        const date = new Date(record.date || record.createdAt);
        return Number.isFinite(date.getTime()) &&
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth();
      })
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
    return this.crops.filter(crop =>
      String(crop.status || 'Active').toLowerCase() === 'active' &&
      String(crop.currentStage || '').toLowerCase() !== 'harvest'
    ).length;
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
    return [
      {
        label: 'Overall Farm Health',
        value: this.averageHealth ? `${this.averageHealth}%` : 'No data',
        helper: 'Average active field health',
        icon: 'health',
        tone: this.averageHealth >= 75 ? 'good' : this.averageHealth >= 50 ? 'warning' : 'danger'
      },
      {
        label: 'Monthly Profit',
        value: this.formatCurrency(this.monthlyProfit),
        helper: 'Current calendar month',
        icon: 'profit',
        tone: this.monthlyProfit >= 0 ? 'good' : 'danger'
      },
      {
        label: 'Average NDVI',
        value: this.averageNdvi ? this.toNdviDecimal(this.averageNdvi) : 'No data',
        helper: 'Vegetation health signal',
        icon: 'ndvi',
        tone: this.averageNdvi >= 70 ? 'good' : this.averageNdvi >= 50 ? 'warning' : 'danger'
      },
      {
        label: 'Active Operations',
        value: this.activeSignals.length,
        helper: 'Unresolved signals',
        icon: 'operations',
        tone: this.activeSignals.length ? 'warning' : 'good'
      },
      {
        label: 'Weather Risk',
        value: this.weatherRisk,
        helper: 'From active weather signals',
        icon: 'weather',
        tone: this.weatherRisk === 'Stable' ? 'good' : 'warning'
      },
      {
        label: 'Total Farms',
        value: this.farms.length,
        helper: `${this.fields.length} fields monitored`,
        icon: 'farms',
        tone: 'neutral'
      },
      {
        label: 'Active Crops',
        value: this.activeCrops,
        helper: `${this.crops.length} crop records`,
        icon: 'crops',
        tone: 'neutral'
      }
    ];
  }

  get farmPerformanceRows() {
    return this.farms.map(farm => {
      const farmId = this.getEntityId(farm);
      const farmFields = this.fields.filter(field => this.getEntityId(field.farm) === farmId);
      const farmSignals = this.activeSignals.filter(signal => this.getEntityId(signal.farm) === farmId);
      const farmRecords = this.records.filter(record => this.getEntityId(record.farm) === farmId);
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

  get cropPerformanceRows() {
    const rows = this.crops.map(crop => {
      const cropId = this.getEntityId(crop);
      const cropFields = this.fields.filter(field => this.getEntityId(field.crop) === cropId);
      const cropRecords = this.records.filter(record => this.getEntityId(record.crop) === cropId);
      const revenue = this.sumRecordSet(cropRecords, 'Income');
      const expenses = this.sumRecordSet(cropRecords, 'Expense');
      const avgHealth = this.average(
        cropFields
          .map(field => this.getFieldHealthIndex(field))
          .filter((value): value is number => value !== null)
      );
      const avgNdvi = this.average(cropFields.map(field => this.getFieldNdviPercent(field)));
      const farm = this.farms.find(item => this.getEntityId(item) === this.getEntityId(crop.farm));

      return {
        crop,
        farm: farm?.name || crop.farm?.name || 'Unassigned farm',
        revenue,
        expenses,
        profit: revenue - expenses,
        averageHealth: avgHealth ? `${avgHealth}%` : 'No field data',
        ndvi: avgNdvi ? this.toNdviDecimal(avgNdvi) : 'No field data',
        stage: crop.currentStage || 'Not started'
      };
    });

    return rows.filter(row =>
      row.revenue || row.expenses || row.crop?.name
    );
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
    const recommendations: string[] = [];
    const riskyFarms = this.farmPerformanceRows.filter(row =>
      row.activeAlerts > 0 || row.status !== 'Stable'
    );
    const drySignals = this.activeSignals.filter(signal => signal.category === 'Irrigation');
    const lifecycleSignals = this.activeSignals.filter(signal => signal.category === 'Crop Lifecycle');
    const financialSignals = this.activeSignals.filter(signal => signal.category === 'Financial');

    if (!this.hasOperationalData) {
      return ['No operational data is available yet. Create farms and fields to generate executive reports.'];
    }

    if (this.averageHealth >= 75 && this.averageNdvi >= 70 && !this.activeSignals.length) {
      recommendations.push('Overall farm performance is healthy and no urgent operational signals are active.');
    }

    if (riskyFarms.length) {
      recommendations.push(`Monitor ${riskyFarms[0].farm.name}; it has ${riskyFarms[0].activeAlerts} active operational signal(s).`);
    }

    if (drySignals.length) {
      recommendations.push('Review irrigation schedules for fields with dry conditions or low soil moisture.');
    }

    if (lifecycleSignals.length) {
      recommendations.push('Prepare labor, logistics, and equipment for upcoming lifecycle or harvest operations.');
    }

    if (financialSignals.length || this.totalRevenue < this.totalExpenses) {
      recommendations.push('Financial performance needs review; compare operating costs against revenue by farm and crop.');
    } else if (this.records.length) {
      recommendations.push('Financial performance remains stable based on current revenue and expense records.');
    }

    if (this.averageNdvi && this.averageNdvi < 60) {
      recommendations.push('Review fields with weak vegetation performance and inspect for irrigation, pest, or nutrient stress.');
    }

    return recommendations.slice(0, 5);
  }

  get hasFinancialData() {
    return this.records.length > 0;
  }

  exportCSV() {
    const sections = [
      ['Executive Summary'],
      ['Metric', 'Value', 'Notes'],
      ...this.summaryCards.map(card => [card.label, card.value, card.helper]),
      [],
      ['Farm Performance'],
      ['Farm', 'Area', 'Fields', 'Average NDVI', 'Active Alerts', 'Revenue', 'Expenses', 'Profit', 'Operational Status'],
      ...this.farmPerformanceRows.map(row => [
        row.farm.name,
        row.area,
        row.fields,
        row.averageNdvi,
        row.activeAlerts,
        row.revenue,
        row.expenses,
        row.profit,
        row.status
      ]),
      [],
      ['Crop Performance'],
      ['Crop', 'Farm', 'Revenue', 'Expenses', 'Profit', 'Average Health', 'NDVI', 'Lifecycle Stage'],
      ...this.cropPerformanceRows.map(row => [
        row.crop.name,
        row.farm,
        row.revenue,
        row.expenses,
        row.profit,
        row.averageHealth,
        row.ndvi,
        row.stage
      ]),
      [],
      ['Operations Summary'],
      ['Metric', 'Value'],
      ...this.operationsSummary.map(item => [item.label, item.value]),
      [],
      ['Executive Recommendations'],
      ...this.executiveRecommendations.map(item => [item])
    ];

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
  }

  exportPDF() {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('FarmOps Executive Report', 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 20, y);
    y += 12;

    doc.setFontSize(13);
    doc.text('Executive Summary', 20, y);
    y += 8;
    doc.setFontSize(9);
    this.summaryCards.forEach(card => {
      y = this.writePdfLine(doc, `${card.label}: ${card.value} - ${card.helper}`, y);
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Farm Performance', 20, y);
    y += 8;
    doc.setFontSize(8);
    this.farmPerformanceRows.forEach(row => {
      y = this.writePdfLine(
        doc,
        `${row.farm.name} | ${row.area} ha | ${row.fields} fields | NDVI ${row.averageNdvi} | Profit ${this.formatCurrency(row.profit)} | ${row.status}`,
        y
      );
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Crop Performance', 20, y);
    y += 8;
    doc.setFontSize(8);
    this.cropPerformanceRows.slice(0, 20).forEach(row => {
      y = this.writePdfLine(
        doc,
        `${row.crop.name} | ${row.farm} | Profit ${this.formatCurrency(row.profit)} | Health ${row.averageHealth} | NDVI ${row.ndvi} | ${row.stage}`,
        y
      );
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Operations Summary', 20, y);
    y += 8;
    doc.setFontSize(8);
    this.operationsSummary.forEach(item => {
      y = this.writePdfLine(doc, `${item.label}: ${item.value}`, y);
    });

    y += 6;
    doc.setFontSize(13);
    doc.text('Executive Recommendations', 20, y);
    y += 8;
    doc.setFontSize(8);
    this.executiveRecommendations.forEach(item => {
      y = this.writePdfLine(doc, `- ${item}`, y);
    });

    doc.save('FarmOps-Executive-Report.pdf');
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

  private filterFieldsByCurrentFarms(fields: any[]) {
    const farmIds = new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));
    return fields.filter(field => farmIds.has(this.getEntityId(field.farm)));
  }

  private filterZonesByCurrentFields(zones: any[]) {
    const fieldIds = new Set(this.fields.map(field => this.getEntityId(field)).filter(Boolean));
    return zones.filter(zone => fieldIds.has(this.getEntityId(zone.field)));
  }

  private filterCropsByCurrentContext(crops: any[]) {
    const farmIds = new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));
    const fieldCropIds = new Set(
      this.fields.map(field => this.getEntityId(field.crop)).filter(Boolean)
    );
    const recordCropIds = new Set(
      this.records.map(record => this.getEntityId(record.crop)).filter(Boolean)
    );

    return crops.filter(crop => {
      const cropId = this.getEntityId(crop);
      const farmId = this.getEntityId(crop.farm);

      return (farmId && farmIds.has(farmId)) ||
        fieldCropIds.has(cropId) ||
        recordCropIds.has(cropId);
    });
  }

  private filterRecordsByCurrentFarms(records: any[]) {
    const farmIds = new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));
    return records.filter(record => farmIds.has(this.getEntityId(record.farm)));
  }

  private getEntityId(entity: any) {
    return String(entity?._id || entity || '');
  }

  private sumRecords(type: string) {
    return this.sumRecordSet(this.records, type);
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
    setTimeout(() => {
      this.renderFinancialTrendChart();
      this.renderFinancialSummaryChart();
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
            borderColor: '#14915f',
            backgroundColor: 'rgba(20,145,95,.12)',
            tension: .35,
            fill: true
          },
          {
            label: 'Expenses',
            data: series.expenses,
            borderColor: '#f97316',
            backgroundColor: 'rgba(249,115,22,.1)',
            tension: .35,
            fill: true
          },
          {
            label: 'Profit',
            data: series.profit,
            borderColor: '#0f7dc2',
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
            backgroundColor: ['#14915f', '#f97316', '#0f7dc2'],
            borderRadius: 10
          }
        ]
      },
      options: this.barChartOptions()
    });
  }

  private getMonthlyFinancialSeries() {
    const buckets = new Map<string, { revenue: number; expenses: number; timestamp: number }>();

    this.records.forEach(record => {
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
            color: '#53645a'
          }
        },
        tooltip: {
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#53645a' }
        },
        y: {
          grid: { color: 'rgba(16,24,40,.08)' },
          ticks: { color: '#7a897f' }
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
          backgroundColor: '#142018',
          padding: 12,
          cornerRadius: 10
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#53645a' }
        },
        y: {
          grid: { color: 'rgba(16,24,40,.08)' },
          ticks: { color: '#7a897f' }
        }
      }
    };
  }

  private writePdfLine(doc: jsPDF, text: string, y: number) {
    if (y > 278) {
      doc.addPage();
      y = 20;
    }

    doc.text(text.slice(0, 118), 20, y);
    return y + 7;
  }

}
