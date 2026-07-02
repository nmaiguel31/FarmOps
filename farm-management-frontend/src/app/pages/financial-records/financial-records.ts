import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { catchError, forkJoin, of } from 'rxjs';
import { FinancialRecord } from '../../services/financial-record';
import jsPDF from 'jspdf';
import {
  addFarmOpsPdfFooters,
  drawFarmOpsPdfHeader,
  loadFarmOpsPdfLogo
} from '../../shared/pdf-branding';
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
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import { ConfirmationService } from '../../shared/confirm/confirmation.service';
import { ToastService } from '../../shared/toast/toast.service';
import {
  getCurrentCrops,
  getCurrentFields,
  getEntityId as getScopedEntityId
} from '../../shared/current-data-scope';

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
    LucideTrendingUp,
    EmptyStateComponent
  ],
  templateUrl: './financial-records.html',
  styleUrl: './financial-records.css',
})
export class FinancialRecords implements OnInit {

  records: any[] = [];
  farms: any[] = [];
  fields: any[] = [];
  crops: any[] = [];
  recordsLoading = true;
  recordActionLoading = false;
  exportActionLoading = false;
  profitByCropBreakdown = {
    totalProfit: 0,
    entries: [] as Array<{ crop: string; profit: number; percent: number }>
  };

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
  filterSearch = '';
  chartView: 'month' | 'day' = 'month';

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
  readonly skeletonRows = [1, 2, 3, 4, 5];

  private financialService = inject(FinancialRecord);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.loadFinancialData();
  }

  loadFinancialData() {
    this.recordsLoading = true;

    forkJoin({
      records: this.financialService.getRecords().pipe(catchError(error => this.handleListRequestError(error))),
      farms: this.financialService.getFarms().pipe(catchError(error => this.handleListRequestError(error))),
      fields: this.financialService.getFields().pipe(catchError(error => this.handleListRequestError(error))),
      crops: this.financialService.getCrops().pipe(catchError(error => this.handleListRequestError(error)))
    }).subscribe({
      next: ({ records, farms, fields, crops }: any) => {
        this.records = [...this.normalizeList(records)];
        this.farms = [...this.normalizeList(farms)];
        this.fields = [...this.normalizeList(fields)];
        this.crops = [...this.normalizeList(crops)];
        this.recordsLoading = false;
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.recordsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadFarms() {
    this.financialService.getFarms().subscribe({
      next: (data: any) => {
        this.farms = [...this.normalizeList(data)];
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadFields() {
    this.financialService.getFields().subscribe({
      next: (data: any) => {
        this.fields = [...this.normalizeList(data)];
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadCrops() {
    this.financialService.getCrops().subscribe({
      next: (data: any) => {
        this.crops = [...this.normalizeList(data)];
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => console.error(error)
    });
  }

  loadRecords() {
    this.recordsLoading = true;
    this.financialService.getRecords().subscribe({
      next: (data: any) => {
        this.records = [...this.normalizeList(data)];
        this.recordsLoading = false;
        this.renderChartsSoon();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.recordsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  createRecord() {
    if (this.recordActionLoading) {
      return;
    }
    this.recordActionLoading = true;

    this.financialService.createRecord(this.getRecordData()).subscribe({
      next: () => {
        this.resetRecordForm();
        this.recordFormOpen = false;
        this.recordActionLoading = false;
        this.loadRecords();
        this.toast.success('Financial record created', 'The transaction was added.');
      },
      error: (error) => {
        console.error(error);
        this.recordActionLoading = false;
        this.toast.error('Could not create financial record', error?.error?.message || 'Please review the form and try again.');
      }
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
    if (this.recordActionLoading) {
      return;
    }
    this.recordActionLoading = true;

    this.financialService.updateRecord(
      this.editingRecordId,
      this.getRecordData()
    ).subscribe({
      next: () => {
        this.resetRecordForm();
        this.recordFormOpen = false;
        this.recordActionLoading = false;
        this.loadRecords();
        this.toast.success('Financial record updated', 'The transaction was saved.');
      },
      error: (error) => {
        console.error(error);
        this.recordActionLoading = false;
        this.toast.error('Could not update financial record', error?.error?.message || 'Please try again.');
      }
    });
  }

  deleteRecord(id: string) {
    const confirmed = this.confirmation.confirmDestructive(
      'Delete this financial record?',
      'This removes the transaction from profitability reports and exports. This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    this.financialService.deleteRecord(id).subscribe({
      next: () => {
        this.loadRecords();
        this.toast.success('Financial record deleted', 'The transaction was removed.');
      },
      error: (error) => {
        console.error(error);
        this.toast.error('Could not delete financial record', error?.error?.message || 'Please try again.');
      }
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
    this.renderChartsSoon();
  }

  onFilterFieldChange() {
    this.filterCrop = 'All';
    this.renderChartsSoon();
  }

  onFiltersChanged() {
    this.renderChartsSoon();
  }

  get filteredRecords() {
    const search =
      this.normalizeSearch(this.filterSearch);

    return this.records.filter(record => {
      return this.matchesFilter(this.filterType, record.type) &&
        this.matchesFilter(this.filterFarm, this.getEntityId(record.farm)) &&
        this.matchesFilter(this.filterField, this.getEntityId(record.field)) &&
        this.matchesFilter(this.filterCrop, this.getEntityId(record.crop)) &&
        this.matchesFilter(this.filterCategory, record.category) &&
        this.matchesFilter(this.filterPaymentStatus, record.paymentStatus || 'Paid') &&
        this.matchesDateRange(record) &&
        this.matchesSearch(record, search);
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
    return getCurrentFields(this.farms, this.fields);
  }

  get validCrops() {
    return getCurrentCrops(this.farms, this.validFields, this.crops, this.records);
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
    return this.filteredRecords
      .filter(record => ['Pending', 'Overdue'].includes(record.paymentStatus || 'Paid'))
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  }

  get selectedFarmContext() {
    if (this.filterFarm === 'All') {
      return 'All farms';
    }

    return this.farms.find(farm => farm._id === this.filterFarm)?.name || 'Selected farm';
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
        detail: this.selectedFarmContext,
        tone: 'income',
        icon: 'revenue',
        helper: `${this.filteredRecords.filter(record => record.type === 'Income').length} income records`
      },
      {
        label: 'Total Expenses',
        value: this.totalExpenses,
        detail: this.selectedFarmContext,
        tone: 'expense',
        icon: 'expenses',
        helper: `${this.filteredRecords.filter(record => record.type === 'Expense').length} expense records`
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
        helper: `${this.filteredRecords.filter(record => ['Pending', 'Overdue'].includes(record.paymentStatus || 'Paid')).length} pending items`
      }
    ];
  }

  get topExpenseCategories() {
    return this.getExpensesByCategory().labels.map((label, index) => ({
      label,
      amount: this.getExpensesByCategory().values[index] || 0
    }));
  }

  get largestExpenseRecords() {
    return this.filteredRecords
      .filter(record => record.type === 'Expense')
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5);
  }

  get hasFinancialHistory() {
    return this.getFinancialPerformanceSeries().labels.length > 0;
  }

  get hasCategoryExpenses() {
    return this.getExpensesByCategory().values.some(value => value > 0);
  }

  get hasCropProfit() {
    return this.profitByCropBreakdown.entries.length > 0;
  }

  get hasFieldProfit() {
    return this.getProfitByField().values.some(value => value !== 0);
  }

  getCategoryOptions() {
    return this.recordType === 'Income'
      ? this.incomeCategories
      : this.expenseCategories;
  }

  get categoryOptions() {
    return this.getCategoryOptions();
  }

  trackById = (index: number, item: any): string =>
    String(item?._id || item?.id || item?.name || item?.label || index);

  trackByValue = (index: number, item: any): string =>
    String(item ?? index);

  trackByCropProfit = (index: number, item: any): string =>
    String(item?.crop || item?.name || index);

  trackByLabel = (index: number, item: any): string =>
    String(item?.label || item?.category || item?.crop || item?.title || item?.name || index);

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

  getCropIcon(crop: any) {
    const cropIcons: Record<string, string> = {
      corn: '🌽',
      wheat: '🌾',
      rice: '🌾',
      barley: '🌾',
      oats: '🌾',
      rye: '🌾',
      sorghum: '🌾',
      soybean: '🫘',
      peas: '🫛',
      lentils: '🫘',
      chickpeas: '🫘',
      beans: '🫘',
      grapes: '🍇',
      apples: '🍎',
      oranges: '🍊',
      lemons: '🍋',
      avocado: '🥑',
      banana: '🍌',
      mango: '🥭',
      strawberry: '🍓',
      pineapple: '🍍',
      tomato: '🍅',
      potato: '🥔',
      onion: '🧅',
      carrot: '🥕',
      lettuce: '🥬',
      cucumber: '🥒',
      'bell pepper': '🫑',
      broccoli: '🥦',
      cabbage: '🥬',
      cotton: '🌿',
      sugarcane: '🎋',
      sunflower: '🌻',
      coffee: '☕',
      cocoa: '🍫',
      tobacco: '🌿',
      olives: '🫒',
      almonds: '🌰',
      walnuts: '🌰',
      pistachios: '🌰',
      tea: '🍃',
      canola: '🌼',
      cassava: '🌱',
      quinoa: '🌾',
      flax: '🌿'
    };
    const categoryIcons: Record<string, string> = {
      cereal: '🌾',
      grain: '🌾',
      legume: '🫘',
      'fruit crop': '🍇',
      fruit: '🍇',
      vegetable: '🥬',
      'industrial crop': '🌿',
      fiber: '🌿',
      oilseed: '🌻',
      'cash crop': '🌿',
      'tree crop': '🌳',
      'specialty crop': '🌱'
    };
    const nameKey =
      String(crop?.name || '').trim().toLowerCase();
    const typeKey =
      String(crop?.type || '').trim().toLowerCase();

    return crop?.icon || cropIcons[nameKey] || categoryIcons[typeKey] || '🌱';
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
    this.filterSearch = '';
    this.renderChartsSoon();
  }

  setChartView(view: 'month' | 'day') {
    this.chartView = view;
    this.renderChartsSoon();
  }

  exportCSV() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;
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
    this.toast.success('Financial CSV exported', 'The financial records CSV is ready.');
    this.exportActionLoading = false;
  }

  async exportPDF() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;

    const doc = new jsPDF();
    const records = this.filteredRecords;
    const logoDataUrl = await loadFarmOpsPdfLogo();

    let yPosition = this.drawPdfHeader(doc, logoDataUrl, 'Financial Report');
    yPosition = this.drawFinancePdfSummary(doc, yPosition);
    yPosition += 8;
    yPosition = this.drawFinancePdfTableHeader(doc, yPosition);

    records.forEach(record => {
      if (yPosition > 268) {
        doc.addPage();
        yPosition = this.drawPdfHeader(doc, logoDataUrl, 'Financial Report');
        yPosition = this.drawFinancePdfTableHeader(doc, yPosition);
      }

      const values = [
        this.getRecordDate(record),
        record.type || '-',
        record.category || '-',
        this.getFarmName(record),
        this.getFieldName(record),
        this.getCropName(record),
        this.formatCurrency(Number(record.amount || 0)),
        record.paymentStatus || 'Paid'
      ];
      const widths = [24, 20, 26, 30, 28, 26, 24, 24];
      let x = 8;
      doc.setFontSize(7);
      doc.setTextColor(25, 38, 31);
      values.forEach((value, index) => {
        doc.text(String(value), x + 1.5, yPosition + 6, {
          maxWidth: widths[index] - 3
        });
        x += widths[index];
      });
      doc.setDrawColor(229, 234, 227);
      doc.line(8, yPosition + 10, 202, yPosition + 10);
      yPosition += 11;
    });

    addFarmOpsPdfFooters(doc);
    doc.save('FarmOps-Financial-Report.pdf');
    this.toast.success('Financial PDF exported', 'The financial report is ready.');
    this.exportActionLoading = false;
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
    return this.filteredRecords
      .filter(record => record.type === type)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  }

  private matchesFilter(filter: string, value: any) {
    return filter === 'All' || String(value || '') === filter;
  }

  private matchesSearch(record: any, search: string) {
    if (!search) {
      return true;
    }

    return [
      record.description,
      record.notes,
      record.category,
      record.type,
      record.paymentStatus,
      this.getFarmName(record),
      this.getFieldName(record),
      this.getCropName(record),
      record.buyer,
      record.vendor
    ]
      .some(value => this.normalizeSearch(value).includes(search));
  }

  private normalizeSearch(value: any) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private handleListRequestError(error: any) {
    console.error(error);
    return of([]);
  }

  private normalizeList(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }

    const collectionKeys = [
      'records',
      'financialRecords',
      'farms',
      'fields',
      'crops',
      'data',
      'items',
      'results'
    ];

    for (const key of collectionKeys) {
      if (Array.isArray(value?.[key])) {
        return value[key];
      }
    }

    return [];
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
    return getScopedEntityId(entity);
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

  private formatCurrency(value: number) {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }
    ).format(value || 0);
  }

  private drawPdfHeader(doc: jsPDF, logoDataUrl: string, title: string) {
    return drawFarmOpsPdfHeader(
      doc,
      logoDataUrl,
      {
        title,
        generatedLabel: `Generated: ${new Date().toLocaleDateString('en-US')}`,
        periodLabel: this.selectedFarmContext
      }
    );
  }

  private drawFinancePdfSummary(doc: jsPDF, y: number) {
    const cards = [
      ['Revenue', this.formatCurrency(this.totalIncome), '#14915f'],
      ['Expenses', this.formatCurrency(this.totalExpenses), '#ef5b3d'],
      ['Net Profit', this.formatCurrency(this.netProfit), this.netProfit >= 0 ? '#14915f' : '#ef5b3d'],
      ['Profit Margin', `${this.profitMargin}%`, '#0f7dc2'],
      ['Pending', this.formatCurrency(this.pendingPayments), '#d89112']
    ];

    cards.forEach((card, index) => {
      const x = 14 + (index * 37);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(221, 229, 222);
      doc.roundedRect(x, y, 34, 22, 3, 3, 'FD');
      doc.setTextColor(96, 112, 104);
      doc.setFontSize(7);
      doc.text(String(card[0]), x + 3, y + 7);
      doc.setTextColor(card[2] as string);
      doc.setFontSize(10);
      doc.text(String(card[1]), x + 3, y + 16, {
        maxWidth: 28
      });
    });

    return y + 28;
  }

  private drawFinancePdfTableHeader(doc: jsPDF, y: number) {
    const headers = ['Date', 'Type', 'Category', 'Farm', 'Field', 'Crop', 'Amount', 'Status'];
    const widths = [24, 20, 26, 30, 28, 26, 24, 24];
    let x = 8;
    doc.setFillColor(20, 151, 91);
    doc.rect(8, y, 194, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    headers.forEach((header, index) => {
      doc.text(header, x + 1.5, y + 6);
      x += widths[index];
    });
    return y + 10;
  }

  private renderChartsSoon() {
    this.refreshChartSummaries();
    setTimeout(() => {
      this.renderRevenueExpenseChart();
      this.renderProfitByCropChart();
    }, 150);
  }

  private refreshChartSummaries() {
    this.profitByCropBreakdown = this.getProfitByCropBreakdown();
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
      this.getFinancialPerformanceSeries();

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

  private getFinancialPerformanceSeries() {
    const buckets = new Map<string, { income: number; expenses: number; timestamp: number }>();

    this.filteredRecords.forEach(record => {
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
      const isDayView =
        this.chartView === 'day';
      const label =
        isDayView
          ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsedDate)
          : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(parsedDate);
      const bucketStart =
        isDayView
          ? new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()).getTime()
          : new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1).getTime();

      if (!buckets.has(label)) {
        buckets.set(label, { income: 0, expenses: 0, timestamp: bucketStart });
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
      expenses: series.map(([, value]) => value.expenses)
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

    this.filteredRecords
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

    this.filteredRecords
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

    this.filteredRecords
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
