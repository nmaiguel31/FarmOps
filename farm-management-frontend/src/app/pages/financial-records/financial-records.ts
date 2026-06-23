import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { FinancialRecord } from '../../services/financial-record';
import jsPDF from 'jspdf';
import {
  LucideBadgeDollarSign,
  LucideChartPie,
  LucideClock3,
  LucideDownload,
  LucideFileText,
  LucidePencil,
  LucidePlus,
  LucideReceipt,
  LucideTrash2,
  LucideTrendingUp
} from '@lucide/angular';

Chart.register(...registerables);

@Component({
  selector: 'app-financial-records',
  imports: [
    CommonModule,
    FormsModule,
    LucideBadgeDollarSign,
    LucideChartPie,
    LucideClock3,
    LucideDownload,
    LucideFileText,
    LucidePencil,
    LucidePlus,
    LucideReceipt,
    LucideTrash2,
    LucideTrendingUp
  ],
  templateUrl: './financial-records.html',
  styleUrl: './financial-records.css',
})
export class FinancialRecords implements OnInit {

  records: any[] = [];
  farms: any[] = [];
  fields: any[] = [];
  crops: any[] = [];

  recordType = 'Expense';
  recordCategory = 'Other Expense';
  recordAmount = 0;
  recordDescription = '';
  recordDate = this.getTodayInput();
  selectedFarm = '';
  selectedField = '';
  selectedCrop = '';
  recordQuantity: number | null = null;
  recordUnit = '';
  recordUnitPrice: number | null = null;
  recordBuyer = '';
  recordVendor = '';
  recordPaymentStatus = 'Paid';
  recordNotes = '';
  editingRecordId = '';
  recordFormOpen = false;

  filterType = 'All';
  filterFarm = 'All';
  filterField = 'All';
  filterCrop = 'All';
  filterCategory = 'All';
  filterPaymentStatus = 'All';
  filterStartDate = '';
  filterEndDate = '';

  readonly incomeCategories = [
    'Crop Sale',
    'Subsidy',
    'Service Income',
    'Other Income'
  ];
  readonly expenseCategories = [
    'Seeds',
    'Fertilizer',
    'Irrigation',
    'Labor',
    'Fuel',
    'Equipment',
    'Maintenance',
    'Transport',
    'Other Expense'
  ];
  readonly paymentStatuses = [
    'Paid',
    'Pending',
    'Overdue'
  ];

  private financialService = inject(FinancialRecord);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadRecords();
    this.loadFarms();
    this.loadFields();
    this.loadCrops();
  }

  loadFarms() {
    this.financialService.getFarms().subscribe({
      next: (data: any) => {
        this.farms = [...data];
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadFields() {
    this.financialService.getFields().subscribe({
      next: (data: any) => {
        this.fields = [...data];
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadCrops() {
    this.financialService.getCrops().subscribe({
      next: (data: any) => {
        this.crops = [...data];
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadRecords() {
    this.financialService.getRecords().subscribe({
      next: (data: any) => {
        this.records = [...data];
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  createRecord() {
    this.financialService.createRecord(this.getRecordData()).subscribe({
      next: () => {
        this.resetRecordForm();
        this.recordFormOpen = false;
        this.loadRecords();
      },
      error: (error) => console.error(error)
    });
  }

  editRecord(record: any) {
    this.editingRecordId = record._id;
    this.recordType = record.type || 'Expense';
    this.recordCategory = record.category || this.getCategoryOptions()[0];
    this.recordAmount = Number(record.amount || 0);
    this.recordDescription = record.description || '';
    this.recordDate = this.toDateInputValue(record.date || record.createdAt);
    this.selectedFarm = this.getEntityId(record.farm);
    this.selectedField = this.getEntityId(record.field);
    this.selectedCrop = this.getEntityId(record.crop);
    this.recordQuantity = record.quantity ?? null;
    this.recordUnit = record.unit || '';
    this.recordUnitPrice = record.unitPrice ?? null;
    this.recordBuyer = record.buyer || '';
    this.recordVendor = record.vendor || '';
    this.recordPaymentStatus = record.paymentStatus || 'Paid';
    this.recordNotes = record.notes || '';
    this.recordFormOpen = true;
  }

  updateRecord() {
    this.financialService.updateRecord(
      this.editingRecordId,
      this.getRecordData()
    ).subscribe({
      next: () => {
        this.resetRecordForm();
        this.recordFormOpen = false;
        this.loadRecords();
      },
      error: (error) => console.error(error)
    });
  }

  deleteRecord(id: string) {
    const confirmed = confirm(
      'Are you sure you want to delete this financial record?'
    );

    if (!confirmed) {
      return;
    }

    this.financialService.deleteRecord(id).subscribe({
      next: () => this.loadRecords(),
      error: (error) => console.error(error)
    });
  }

  openCreateRecord() {
    this.resetRecordForm();
    this.recordFormOpen = true;
  }

  closeRecordForm() {
    this.recordFormOpen = false;
  }

  onTypeChange() {
    this.recordCategory = this.getCategoryOptions()[0];
    this.recordBuyer = '';
    this.recordVendor = '';
  }

  onFarmChange() {
    this.selectedField = '';
    this.selectedCrop = '';
  }

  onFieldChange() {
    const field =
      this.validFields.find(item => item._id === this.selectedField);

    this.selectedCrop =
      field?.crop?._id || field?.crop || this.selectedCrop;
  }

  onFilterFarmChange() {
    this.filterField = 'All';
    this.filterCrop = 'All';
  }

  onFilterFieldChange() {
    this.filterCrop = 'All';
  }

  get filteredRecords() {
    return this.records.filter(record => {
      return this.matchesFilter(this.filterType, record.type) &&
        this.matchesFilter(this.filterFarm, this.getEntityId(record.farm)) &&
        this.matchesFilter(this.filterField, this.getEntityId(record.field)) &&
        this.matchesFilter(this.filterCrop, this.getEntityId(record.crop)) &&
        this.matchesFilter(this.filterCategory, record.category) &&
        this.matchesFilter(this.filterPaymentStatus, record.paymentStatus || 'Paid') &&
        this.matchesDateRange(record);
    });
  }

  get visibleFields() {
    return this.validFields.filter(field =>
      !this.selectedFarm || this.getEntityId(field.farm) === this.selectedFarm
    );
  }

  get visibleCrops() {
    return this.validCrops.filter(crop => {
      const farmMatches =
        !this.selectedFarm || this.getEntityId(crop.farm) === this.selectedFarm;

      if (!farmMatches) {
        return false;
      }

      if (!this.selectedField) {
        return true;
      }

      const field =
        this.validFields.find(item => item._id === this.selectedField);

      return !field?.crop ||
        this.getEntityId(field.crop) === crop._id;
    });
  }

  get validFields() {
    const farmIds =
      new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));

    return this.fields.filter(field =>
      farmIds.has(this.getEntityId(field.farm))
    );
  }

  get validCrops() {
    const farmIds =
      new Set(this.farms.map(farm => this.getEntityId(farm)).filter(Boolean));

    return this.crops.filter(crop =>
      farmIds.has(this.getEntityId(crop.farm))
    );
  }

  get filterFieldOptions() {
    return this.validFields.filter(field =>
      this.filterFarm === 'All' || this.getEntityId(field.farm) === this.filterFarm
    );
  }

  get filterCropOptions() {
    return this.validCrops.filter(crop => {
      const farmMatches =
        this.filterFarm === 'All' || this.getEntityId(crop.farm) === this.filterFarm;

      if (!farmMatches) {
        return false;
      }

      if (this.filterField === 'All') {
        return true;
      }

      const field =
        this.validFields.find(item => item._id === this.filterField);

      return !field?.crop ||
        this.getEntityId(field.crop) === crop._id;
    });
  }

  get allCategories() {
    return Array.from(
      new Set([
        ...this.incomeCategories,
        ...this.expenseCategories,
        ...this.records.map(record => record.category).filter(Boolean)
      ])
    );
  }

  get totalIncome() {
    return this.sumByType('Income');
  }

  get totalExpenses() {
    return this.sumByType('Expense');
  }

  get netProfit() {
    return this.totalIncome - this.totalExpenses;
  }

  get pendingPayments() {
    return this.records
      .filter(record => ['Pending', 'Overdue'].includes(record.paymentStatus || 'Paid'))
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  }

  get profitMargin() {
    if (!this.totalIncome) {
      return 0;
    }

    return Math.round((this.netProfit / this.totalIncome) * 100);
  }

  get financialSummaryCards() {
    return [
      {
        label: 'Total Revenue',
        value: this.totalIncome,
        detail: 'Across all records',
        tone: 'income',
        icon: 'revenue',
        helper: `${this.records.filter(record => record.type === 'Income').length} income records`
      },
      {
        label: 'Total Expenses',
        value: this.totalExpenses,
        detail: 'Across all records',
        tone: 'expense',
        icon: 'expenses',
        helper: `${this.records.filter(record => record.type === 'Expense').length} expense records`
      },
      {
        label: 'Net Profit',
        value: this.netProfit,
        detail: 'Revenue minus expenses',
        tone: 'profit',
        icon: 'profit',
        helper: this.netProfit >= 0 ? 'Positive operating margin' : 'Expenses exceed revenue'
      },
      {
        label: 'Profit Margin',
        value: `${this.profitMargin}%`,
        detail: 'Net profit as a share of revenue',
        tone: 'margin',
        icon: 'margin',
        plain: true,
        helper: this.totalIncome ? 'Calculated from real revenue' : 'No revenue recorded yet'
      },
      {
        label: 'Pending Payments',
        value: this.pendingPayments,
        detail: 'Pending and overdue records',
        tone: 'pending',
        icon: 'pending',
        helper: `${this.records.filter(record => ['Pending', 'Overdue'].includes(record.paymentStatus || 'Paid')).length} pending items`
      }
    ];
  }

  get hasFinancialHistory() {
    return this.getMonthlyFinancialSeries().labels.length >= 2;
  }

  get hasCategoryExpenses() {
    return this.getExpensesByCategory().values.some(value => value > 0);
  }

  get hasCropProfit() {
    return this.getProfitByCropBreakdown().entries.length > 0;
  }

  get hasFieldProfit() {
    return this.getProfitByField().values.some(value => value !== 0);
  }

  getCategoryOptions() {
    return this.recordType === 'Income'
      ? this.incomeCategories
      : this.expenseCategories;
  }

  getAmountPreview() {
    const calculatedAmount =
      this.calculateAmountFromQuantity();

    return calculatedAmount ?? Number(this.recordAmount || 0);
  }

  getPartyLabel(record = { type: this.recordType } as any) {
    return record.type === 'Income' ? 'Buyer' : 'Vendor';
  }

  getPartyValue(record: any) {
    return record.type === 'Income'
      ? record.buyer || ''
      : record.vendor || '';
  }

  getEntityName(entity: any, fallback = '-') {
    return entity?.name || fallback;
  }

  getFarmName(record: any) {
    if (record.farm?.name) {
      return record.farm.name;
    }

    return this.getEntityId(record.farm) ? 'Unavailable farm' : '-';
  }

  getFieldName(record: any) {
    if (record.field?.name) {
      return record.field.name;
    }

    return this.getEntityId(record.field) ? 'Deleted field' : '-';
  }

  getCropName(record: any) {
    if (record.crop?.name) {
      return record.crop.name;
    }

    return this.getEntityId(record.crop) ? 'Unavailable crop' : '-';
  }

  getRecordDate(record: any) {
    return this.formatDate(record.date || record.createdAt);
  }

  resetFilters() {
    this.filterType = 'All';
    this.filterFarm = 'All';
    this.filterField = 'All';
    this.filterCrop = 'All';
    this.filterCategory = 'All';
    this.filterPaymentStatus = 'All';
    this.filterStartDate = '';
    this.filterEndDate = '';
  }

  exportCSV() {
    const headers = [
      'Date',
      'Type',
      'Category',
      'Farm',
      'Field',
      'Crop',
      'Quantity',
      'Unit',
      'Unit Price',
      'Amount',
      'Payment Status',
      'Buyer/Vendor',
      'Notes'
    ];

    const rows = this.filteredRecords.map(record => [
      this.getRecordDate(record),
      record.type,
      record.category,
      this.getFarmName(record),
      this.getFieldName(record),
      this.getCropName(record),
      record.quantity ?? '',
      record.unit || '',
      record.unitPrice ?? '',
      record.amount,
      record.paymentStatus || 'Paid',
      this.getPartyValue(record),
      record.notes || record.description || ''
    ]);

    const csvContent =
      [headers, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(
      [csvContent],
      { type: 'text/csv;charset=utf-8;' }
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'financial-records.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportPDF() {
    const doc = new jsPDF();
    const records = this.filteredRecords;

    doc.setFontSize(18);
    doc.text('FarmOps Financial Report', 20, 20);
    doc.setFontSize(11);
    doc.text(`Total Records: ${records.length}`, 20, 38);
    doc.text(`Total Revenue: $${this.totalIncome}`, 20, 48);
    doc.text(`Total Expenses: $${this.totalExpenses}`, 20, 58);
    doc.text(`Net Profit: $${this.netProfit}`, 20, 68);
    doc.text(`Pending Payments: $${this.pendingPayments}`, 20, 78);

    let yPosition = 96;

    records.forEach(record => {
      const line =
        `${this.getRecordDate(record)} | ${record.type} | ${record.category} | ` +
        `${this.getFarmName(record)} | ${this.getFieldName(record)} | ` +
        `${this.getCropName(record)} | $${record.amount} | ${record.paymentStatus || 'Paid'}`;

      doc.text(line.slice(0, 120), 20, yPosition);
      yPosition += 8;

      if (yPosition > 278) {
        doc.addPage();
        yPosition = 20;
      }
    });

    doc.save('FarmOps-Financial-Report.pdf');
  }

  private getRecordData() {
    const calculatedAmount =
      this.calculateAmountFromQuantity();

    return {
      type: this.recordType,
      category: this.recordCategory,
      amount: calculatedAmount ?? this.recordAmount,
      description: this.recordDescription,
      date: this.recordDate,
      farm: this.selectedFarm,
      field: this.selectedField || null,
      crop: this.selectedCrop || null,
      quantity: this.recordQuantity,
      unit: this.recordUnit,
      unitPrice: this.recordUnitPrice,
      buyer: this.recordBuyer,
      vendor: this.recordVendor,
      paymentStatus: this.recordPaymentStatus,
      notes: this.recordNotes
    };
  }

  private calculateAmountFromQuantity() {
    const quantity = Number(this.recordQuantity);
    const unitPrice = Number(this.recordUnitPrice);

    if (
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(unitPrice) &&
      unitPrice > 0
    ) {
      return quantity * unitPrice;
    }

    return null;
  }

  private resetRecordForm() {
    this.editingRecordId = '';
    this.recordType = 'Expense';
    this.recordCategory = 'Other Expense';
    this.recordAmount = 0;
    this.recordDescription = '';
    this.recordDate = this.getTodayInput();
    this.selectedFarm = '';
    this.selectedField = '';
    this.selectedCrop = '';
    this.recordQuantity = null;
    this.recordUnit = '';
    this.recordUnitPrice = null;
    this.recordBuyer = '';
    this.recordVendor = '';
    this.recordPaymentStatus = 'Paid';
    this.recordNotes = '';
  }

  private sumByType(type: string) {
    return this.records
      .filter(record => record.type === type)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  }

  private matchesFilter(filter: string, value: any) {
    return filter === 'All' || String(value || '') === filter;
  }

  private matchesDateRange(record: any) {
    const date =
      record.date || record.createdAt;

    if (!date || (!this.filterStartDate && !this.filterEndDate)) {
      return true;
    }

    const timestamp =
      new Date(date).getTime();

    if (!Number.isFinite(timestamp)) {
      return true;
    }

    if (this.filterStartDate) {
      const start =
        new Date(this.filterStartDate).getTime();

      if (Number.isFinite(start) && timestamp < start) {
        return false;
      }
    }

    if (this.filterEndDate) {
      const end =
        new Date(this.filterEndDate).getTime() + 86399999;

      if (Number.isFinite(end) && timestamp > end) {
        return false;
      }
    }

    return true;
  }

  private getEntityId(entity: any) {
    return String(entity?._id || entity || '');
  }

  private getTodayInput() {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateInputValue(date: any) {
    if (!date) {
      return this.getTodayInput();
    }

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? this.getTodayInput()
      : parsedDate.toISOString().slice(0, 10);
  }

  private formatDate(date: any) {
    if (!date) {
      return 'Not dated';
    }

    const parsedDate = new Date(date);

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

  private renderChartsSoon() {
    setTimeout(() => {
      this.renderRevenueExpenseChart();
      this.renderProfitByCropChart();
    }, 150);
  }

  private renderRevenueExpenseChart() {
    const canvas =
      document.getElementById('financeRevenueExpenseChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    if (!this.hasFinancialHistory) {
      return;
    }

    const series =
      this.getMonthlyFinancialSeries();

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [
          {
            label: 'Revenue',
            data: series.income,
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
            borderColor: '#4f83a8',
            backgroundColor: 'rgba(79,131,168,.1)',
            tension: .35,
            fill: false
          }
        ]
      },
      options: this.chartOptions()
    });
  }

  private renderProfitByCropChart() {
    const canvas =
      document.getElementById('financeProfitByCropChart') as HTMLCanvasElement;

    if (!canvas) {
      return;
    }

    Chart.getChart(canvas)?.destroy();

    const breakdown =
      this.getProfitByCropBreakdown();

    if (!breakdown.entries.length) {
      return;
    }

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: breakdown.entries.map(item => item.crop),
        datasets: [
          {
            data: breakdown.entries.map(item => Math.abs(item.profit)),
            backgroundColor: ['#14915f', '#0f7dc2', '#f97316', '#7cb342', '#8b5cf6', '#64748b'],
            borderColor: '#ffffff',
            borderWidth: 5
          }
        ]
      },
      options: this.doughnutOptions()
    });
  }

  private getMonthlyFinancialSeries() {
    const buckets = new Map<string, { income: number; expenses: number; timestamp: number }>();

    this.records.forEach(record => {
      const date = record.date || record.createdAt;

      if (!date) {
        return;
      }

      const timestamp = new Date(date).getTime();

      if (!Number.isFinite(timestamp)) {
        return;
      }

      const parsedDate =
        new Date(date);
      const label =
        new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(parsedDate);
      const monthStart =
        new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1).getTime();

      if (!buckets.has(label)) {
        buckets.set(label, { income: 0, expenses: 0, timestamp: monthStart });
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
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    return {
      labels: series.map(([label]) => label),
      income: series.map(([, value]) => value.income),
      expenses: series.map(([, value]) => value.expenses),
      profit: series.map(([, value]) => value.income - value.expenses)
    };
  }

  getProfitByCropBreakdown() {
    const data =
      this.getProfitByCrop();
    const totalAbsoluteProfit =
      data.values.reduce((sum, value) => sum + Math.abs(value), 0);
    const totalProfit =
      data.values.reduce((sum, value) => sum + value, 0);

    return {
      totalProfit,
      entries: data.labels.map((crop, index) => {
        const profit =
          data.values[index] || 0;

        return {
          crop,
          profit,
          percent: totalAbsoluteProfit
            ? Math.round((Math.abs(profit) / totalAbsoluteProfit) * 100)
            : 0
        };
      })
    };
  }

  private getExpensesByCategory() {
    const buckets = new Map<string, number>();

    this.records
      .filter(record => record.type === 'Expense')
      .forEach(record => {
        const label = record.category || 'Uncategorized';
        buckets.set(label, (buckets.get(label) || 0) + Number(record.amount || 0));
      });

    return this.mapBucketsToChartData(buckets);
  }

  private getProfitByCrop() {
    const buckets = new Map<string, number>();
    const validCropIds =
      new Set(this.validCrops.map(crop => this.getEntityId(crop)).filter(Boolean));

    this.records
      .filter(record => validCropIds.has(this.getEntityId(record.crop)))
      .forEach(record => {
        const label = record.crop?.name || 'Unassigned crop';
        const value = Number(record.amount || 0) * (record.type === 'Income' ? 1 : -1);
        buckets.set(label, (buckets.get(label) || 0) + value);
      });

    return this.mapBucketsToChartData(buckets);
  }

  private getProfitByField() {
    const buckets = new Map<string, number>();
    const validFieldIds =
      new Set(this.validFields.map(field => this.getEntityId(field)).filter(Boolean));

    this.records
      .filter(record => validFieldIds.has(this.getEntityId(record.field)))
      .forEach(record => {
        const label = record.field?.name || 'Unassigned field';
        const value = Number(record.amount || 0) * (record.type === 'Income' ? 1 : -1);
        buckets.set(label, (buckets.get(label) || 0) + value);
      });

    return this.mapBucketsToChartData(buckets);
  }

  private mapBucketsToChartData(buckets: Map<string, number>) {
    const entries = Array.from(buckets.entries())
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 6);

    return {
      labels: entries.map(([label]) => label),
      values: entries.map(([, value]) => value)
    };
  }

  private chartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'start',
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            padding: 24,
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
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(16,24,40,.08)' }
        },
        x: {
          grid: { display: false }
        }
      }
    };
  }

  private doughnutOptions(): any {
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
          cornerRadius: 10
        }
      }
    };
  }

}
