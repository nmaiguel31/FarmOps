import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import {
  addFarmOpsPdfFooters,
  drawFarmOpsPdfHeader,
  formatFarmOpsGeneratedDateTime,
  loadFarmOpsPdfLogo
} from '../../shared/pdf-branding';
import {
  LucideCalendarDays,
  LucideDownload,
  LucideDroplet,
  LucideFileText,
  LucideLeaf,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTarget,
  LucideTrash2
} from '@lucide/angular';
import { Crop } from '../../services/crop';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
import { ConfirmationService } from '../../shared/confirm/confirmation.service';
import { ToastService } from '../../shared/toast/toast.service';
import {
  getCurrentFields,
  getCurrentFarms,
  getEntityId as getScopedEntityId
} from '../../shared/current-data-scope';

type GrowthStageForm = {
  name: string;
  startDay: number;
  endDay: number;
};

@Component({
  selector: 'app-crops',
  imports: [
    CommonModule,
    FormsModule,
    LucideCalendarDays,
    LucideDownload,
    LucideDroplet,
    LucideFileText,
    LucideLeaf,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideTarget,
    LucideTrash2,
    EmptyStateComponent
  ],
  templateUrl: './crops.html',
  styleUrl: './crops.css',
})
export class Crops implements OnInit {

  crops: any[] = [];
  farms: any[] = [];
  fields: any[] = [];
  selectedCrop: any = null;
  cropsLoading = true;
  cropActionLoading = false;
  exportActionLoading = false;

  cropFormOpen = false;
  editingCropId = '';

  filterSearch = '';
  filterType = 'All';
  filterStatus = 'All';
  currentPage = 1;
  readonly pageSize = 8;

  cropName = '';
  cropType = '';
  customCropType = '';
  cropStatus = 'Active';
  cropSeason = '';
  cropLifecycleDays: number | null = 120;
  cropNdviTarget: number | null = 0.7;
  cropMoistureTarget: number | null = 55;
  cropTemperatureMin: number | null = null;
  cropTemperatureMax: number | null = null;
  cropExpectedYield = '';
  cropPlantingSeason = '';
  cropDescription = '';
  selectedFarm = '';
  cropGrowthStages: GrowthStageForm[] = [];

  readonly cropTypes = [
    'Cereal',
    'Legume',
    'Vegetable',
    'Fruit Crop',
    'Tree Crop',
    'Industrial Crop',
    'Cash Crop',
    'Specialty Crop',
    'Other'
  ];

  readonly statuses = ['Active', 'Inactive'];

  readonly stageNames = [
    'Planning',
    'Land Preparation',
    'Planting',
    'Vegetative Growth',
    'Flowering',
    'Ripening',
    'Harvest'
  ];

  readonly cropIconMap: Record<string, string> = {
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

  readonly categoryIconMap: Record<string, string> = {
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

  private cropService = inject(Crop);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {
    this.resetGrowthStages();
    this.loadFarms();
    this.loadFields();
    this.loadCrops();
  }

  loadFarms() {
    this.cropService.getFarms().subscribe({
      next: (data: any) => {
        this.farms = [...data];

        if (!this.selectedFarm && this.farms.length > 0) {
          this.selectedFarm = this.farms[0]._id;
        }

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  loadFields() {
    this.cropService.getFields().subscribe({
      next: (data: any) => {
        this.fields = Array.isArray(data) ? [...data] : [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
      }
    });
  }

  loadCrops() {
    this.cropsLoading = true;

    this.cropService.getCrops().subscribe({
      next: (data: any) => {
        this.crops = [...data];

        if (this.selectedCrop) {
          this.selectedCrop =
            this.cropCatalog.find(crop => crop._id === this.selectedCrop._id) ||
            this.cropCatalog[0] ||
            null;
        } else if (this.cropCatalog.length > 0) {
          this.selectedCrop = this.cropCatalog[0];
        }

        this.cropsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.cropsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredCrops() {
    const search =
      this.filterSearch.trim().toLowerCase();

    return this.cropCatalog.filter(crop => {
      const matchesSearch =
        !search ||
        [crop.name, crop.type, crop.season, crop.plantingSeason]
          .some(value => String(value || '').toLowerCase().includes(search));
      const matchesType =
        this.filterType === 'All' || crop.type === this.filterType;
      const matchesStatus =
        this.filterStatus === 'All' ||
        this.getCropStatus(crop) === this.filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }

  get uniqueCropTypes() {
    return Array.from(
      new Set(
        this.cropCatalog
          .map(crop => crop.type)
          .filter(Boolean)
      )
    ).sort();
  }

  get paginatedCrops() {
    const start =
      (this.currentPage - 1) * this.pageSize;

    return this.filteredCrops.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.max(Math.ceil(this.filteredCrops.length / this.pageSize), 1);
  }

  get pageNumbers() {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  get paginationStart() {
    if (this.filteredCrops.length === 0) {
      return 0;
    }

    return ((this.currentPage - 1) * this.pageSize) + 1;
  }

  get paginationEnd() {
    return Math.min(this.currentPage * this.pageSize, this.filteredCrops.length);
  }

  get totalCrops() {
    return this.cropCatalog.length;
  }

  get mostPlantedCrop() {
    if (this.cropCatalog.length === 0) {
      return null;
    }

    const mostPlanted = [...this.cropCatalog].sort(
      (a, b) => this.getFieldsCount(b) - this.getFieldsCount(a)
    )[0];

    return this.getFieldsCount(mostPlanted) > 0 ? mostPlanted : null;
  }

  get averageLifecycle() {
    return this.average(
      this.cropCatalog
        .map(crop => Number(crop.lifecycleDays))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  get averageNdviTarget() {
    return this.average(
      this.cropCatalog
        .map(crop => Number(crop.ndviTarget))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  get averageMoistureTarget() {
    return this.average(
      this.cropCatalog
        .map(crop => Number(crop.moistureTarget))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  get cropCatalog() {
    return this.getDedupedCrops(this.crops);
  }

  selectCrop(crop: any) {
    this.selectedCrop = crop;
  }

  resetFilters() {
    this.filterSearch = '';
    this.filterType = 'All';
    this.filterStatus = 'All';
    this.currentPage = 1;
  }

  onFiltersChanged() {
    this.currentPage = 1;
  }

  goToPage(page: number) {
    this.currentPage =
      Math.min(Math.max(page, 1), this.totalPages);
  }

  trackById = (index: number, item: any): string =>
    String(item?._id || item?.id || item?.name || item?.label || index);

  trackByValue = (index: number, item: any): string =>
    String(item ?? index);

  trackByStage = (index: number, stage: any): string =>
    String(stage?.name || stage?.label || index);

  openCreateCrop() {
    this.editingCropId = '';
    this.cropName = '';
    this.cropType = 'Cereal';
    this.customCropType = '';
    this.cropStatus = 'Active';
    this.cropSeason = '';
    this.cropLifecycleDays = 120;
    this.cropNdviTarget = 0.7;
    this.cropMoistureTarget = 55;
    this.cropTemperatureMin = null;
    this.cropTemperatureMax = null;
    this.cropExpectedYield = '';
    this.cropPlantingSeason = '';
    this.cropDescription = '';
    this.selectedFarm = this.farms[0]?._id || '';
    this.resetGrowthStages();
    this.cropFormOpen = true;
  }

  editCrop(crop: any) {
    this.editingCropId = crop._id;
    this.cropName = crop.name || '';
    this.setCropTypeForForm(crop.type || '');
    this.cropStatus = this.getCropStatus(crop);
    this.cropSeason = crop.season || crop.plantingSeason || '';
    this.cropLifecycleDays = crop.lifecycleDays || 120;
    this.cropNdviTarget = this.toNullableNumber(crop.ndviTarget);
    this.cropMoistureTarget = this.toNullableNumber(crop.moistureTarget);
    this.cropTemperatureMin = this.toNullableNumber(crop.optimalTemperatureMin);
    this.cropTemperatureMax = this.toNullableNumber(crop.optimalTemperatureMax);
    this.cropExpectedYield = crop.expectedYield || '';
    this.cropPlantingSeason = crop.plantingSeason || crop.season || '';
    this.cropDescription = crop.description || '';
    this.selectedFarm = crop.farm?._id || crop.farm || this.farms[0]?._id || '';
    this.cropGrowthStages =
      this.normalizeGrowthStages(crop.growthStages, crop.lifecycleDays || 120);
    this.cropFormOpen = true;
  }

  closeCropForm() {
    this.cropFormOpen = false;
  }

  createCrop() {
    if (this.cropActionLoading) {
      return;
    }
    this.cropActionLoading = true;

    this.cropService.createCrop(this.buildCropPayload()).subscribe({
      next: (crop: any) => {
        this.cropFormOpen = false;
        this.cropActionLoading = false;
        this.selectedCrop = crop;
        this.loadCrops();
        this.toast.success('Crop created', `${crop.name || 'Crop'} is ready to use.`);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.cropActionLoading = false;
        this.toast.error('Could not create crop', error?.error?.message || 'Please review the crop details and try again.');
      }
    });
  }

  updateCrop() {
    if (this.cropActionLoading) {
      return;
    }
    this.cropActionLoading = true;

    this.cropService.updateCrop(
      this.editingCropId,
      this.buildCropPayload()
    ).subscribe({
      next: (crop: any) => {
        this.cropFormOpen = false;
        this.cropActionLoading = false;
        this.editingCropId = '';
        this.selectedCrop = crop;
        this.loadCrops();
        this.toast.success('Crop updated', `${crop.name || 'Crop'} was saved.`);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.cropActionLoading = false;
        this.toast.error('Could not update crop', error?.error?.message || 'Please try again.');
      }
    });
  }

  deleteCrop(id: string) {
    const confirmed =
      this.confirmation.confirmDestructive(
        'Delete this crop?',
        'Fields using this crop may become unassigned. This action cannot be undone.'
      );

    if (!confirmed) {
      return;
    }

    this.cropService.deleteCrop(id).subscribe({
      next: () => {
        this.loadCrops();
        this.toast.success('Crop deleted', 'The crop was removed from the catalog.');
      },
      error: (error) => {
        console.error(error);
        this.toast.error('Could not delete crop', error?.error?.message || 'Please try again.');
      }
    });
  }

  exportCsv() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;

    const headers = [
      'Name',
      'Crop Type',
      'Status',
      'Lifecycle Days',
      'NDVI Target',
      'Moisture Target',
      'Optimal Temperature Min',
      'Optimal Temperature Max',
      'Expected Yield',
      'Planting Season',
      'Fields',
      'Description'
    ];

    const exportCrops =
      this.getDedupedCrops(this.filteredCrops);

    const rows = exportCrops.map(crop => [
      this.getPlainCropName(crop),
      crop.type,
      this.getCropStatus(crop),
      crop.lifecycleDays || '',
      crop.ndviTarget || '',
      crop.moistureTarget || '',
      crop.optimalTemperatureMin || '',
      crop.optimalTemperatureMax || '',
      crop.expectedYield || '',
      crop.plantingSeason || crop.season || '',
      this.getFieldsCount(crop),
      crop.description || ''
    ]);

    const csv = [
      ['FarmOps Crop Catalog Report'],
      ['Generated', formatFarmOpsGeneratedDateTime()],
      ['Period', 'All Crops'],
      [],
      headers,
      ...rows
    ]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'farmops-crops.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    this.toast.success('Crops CSV exported', 'The crop catalog CSV is ready.');
    this.exportActionLoading = false;
  }

  async exportPdf() {
    if (this.exportActionLoading) {
      return;
    }
    this.exportActionLoading = true;

    const doc = new jsPDF();
    const logoDataUrl = await loadFarmOpsPdfLogo();
    let y = this.drawPdfHeader(doc, logoDataUrl, 'Crop Catalog Report');
    const tableLeft = 14;
    const widths = [42, 32, 24, 24, 28, 18, 22];

    y = this.drawPdfSummary(doc, y);
    y += 8;
    y = this.drawCropPdfTableHeader(doc, y, tableLeft, widths);

    const exportCrops =
      this.getDedupedCrops(this.filteredCrops);

    exportCrops.forEach((crop) => {
      if (y > 268) {
        doc.addPage();
        y = this.drawPdfHeader(doc, logoDataUrl, 'Crop Catalog Report');
        y = this.drawCropPdfTableHeader(doc, y, tableLeft, widths);
      }

      const values = [
        this.getPlainCropName(crop),
        crop.type || '-',
        `${crop.lifecycleDays || '-'} days`,
        this.formatNdvi(crop.ndviTarget),
        this.formatPercent(crop.moistureTarget),
        String(this.getFieldsCount(crop)),
        this.getCropStatus(crop)
      ];

      doc.setFontSize(8);
      doc.setTextColor(25, 38, 31);
      let x = tableLeft;
      values.forEach((value, valueIndex) => {
        doc.text(String(value), x + 2, y + 6, {
          maxWidth: widths[valueIndex] - 4
        });
        x += widths[valueIndex];
      });
      doc.setDrawColor(229, 234, 227);
      doc.line(tableLeft, y + 10, 196, y + 10);
      y += 11;
    });

    addFarmOpsPdfFooters(doc);
    doc.save('farmops-crops.pdf');
    this.toast.success('Crops PDF exported', 'The crop catalog report is ready.');
    this.exportActionLoading = false;
  }

  getCropStatus(crop: any) {
    return crop.status || 'Active';
  }

  getFieldsCount(crop: any) {
    const validFarmIds =
      new Set(
        getCurrentFarms(this.farms)
          .map(farm => this.getEntityId(farm))
          .filter(Boolean)
      );
    const cropKey =
      this.getCropCatalogKey(crop);
    const cropIds =
      new Set(
        this.crops
          .filter(candidate => this.getCropCatalogKey(candidate) === cropKey)
          .map(candidate => this.getEntityId(candidate))
          .filter(Boolean)
      );
    const cropName =
      this.getPlainCropName(crop).toLowerCase();
    const cropType =
      String(crop?.type || '').trim().toLowerCase();

    if (!cropKey || cropName === 'unnamed crop') {
      return 0;
    }

    if (!validFarmIds.size) {
      return 0;
    }

    return getCurrentFields(this.farms, this.fields).filter(field => {
      const fieldCropId =
        this.getEntityId(field.crop);

      if (fieldCropId && cropIds.has(fieldCropId)) {
        return true;
      }

      const fieldCrop =
        field.crop && typeof field.crop === 'object' ? field.crop : null;
      const fieldCropName =
        this.getPlainCropName({
          name: fieldCrop?.name || field.cropName || field.cropType
        }).toLowerCase();
      const fieldCropType =
        String(fieldCrop?.type || '').trim().toLowerCase();

      return fieldCropName === cropName &&
        (!cropType || !fieldCropType || fieldCropType === cropType);
    }).length;
  }

  formatNumber(value: number | null, digits = 0) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return 'Not available';
    }

    return Number(value).toFixed(digits);
  }

  formatNdvi(value: any) {
    if (value === null || value === undefined || value === '') {
      return 'Not available';
    }

    return Number(value).toFixed(2);
  }

  formatPercent(value: any) {
    if (value === null || value === undefined || value === '') {
      return 'Not available';
    }

    return `${Number(value).toFixed(0)}%`;
  }

  formatTemperature(crop: any) {
    const min = crop?.optimalTemperatureMin;
    const max = crop?.optimalTemperatureMax;

    if (min === undefined && max === undefined) {
      return 'Not available';
    }

    return `${min ?? '-'}°C - ${max ?? '-'}°C`;
  }

  getStageRange(stage: any) {
    return `${stage.startDay ?? 0} - ${stage.endDay ?? 0} days`;
  }

  private drawPdfHeader(doc: jsPDF, logoDataUrl: string, title: string) {
    return drawFarmOpsPdfHeader(
      doc,
      logoDataUrl,
      {
        title,
        generatedLabel: `Generated: ${formatFarmOpsGeneratedDateTime()}`,
        periodLabel: 'All Crops'
      }
    );
  }

  private drawPdfSummary(doc: jsPDF, y: number) {
    const exportCrops =
      this.getDedupedCrops(this.filteredCrops);
    const exportLifecycle =
      this.average(
        exportCrops
          .map(crop => Number(crop.lifecycleDays))
          .filter(value => Number.isFinite(value) && value > 0)
      );

    const cards = [
      ['Total Crops', exportCrops.length],
      ['Most Planted', this.mostPlantedCrop?.name || 'No usage'],
      ['Avg. Lifecycle', `${exportLifecycle === null ? 0 : Math.round(exportLifecycle)} days`],
      ['Avg. NDVI Target', this.formatNdvi(this.averageNdviTarget)],
      ['Avg. Moisture', this.formatPercent(this.averageMoistureTarget)]
    ];

    cards.forEach((card, index) => {
      const x = 14 + (index * 37);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(221, 229, 222);
      doc.roundedRect(x, y, 34, 22, 3, 3, 'FD');
      doc.setTextColor(96, 112, 104);
      doc.setFontSize(7);
      doc.text(String(card[0]), x + 3, y + 7);
      doc.setTextColor(18, 31, 25);
      doc.setFontSize(10);
      doc.text(String(card[1]), x + 3, y + 16, {
        maxWidth: 28
      });
    });

    return y + 28;
  }

  private drawCropPdfTableHeader(doc: jsPDF, y: number, tableLeft: number, widths: number[]) {
    const headers = ['Crop', 'Type', 'Lifecycle', 'NDVI', 'Moisture', 'Fields', 'Status'];
    doc.setFillColor(20, 151, 91);
    doc.rect(tableLeft, y, 182, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    let x = tableLeft;
    headers.forEach((header, index) => {
      doc.text(header, x + 2, y + 6);
      x += widths[index];
    });
    return y + 10;
  }

  private getDedupedCrops(crops: any[]) {
    const deduped =
      new Map<string, any>();

    crops.forEach(crop => {
      const key =
        this.getCropCatalogKey(crop);

      if (!key || deduped.has(key)) {
        return;
      }

      deduped.set(key, {
        ...crop,
        name: this.getPlainCropName(crop)
      });
    });

    return Array.from(deduped.values());
  }

  private getCropCatalogKey(crop: any) {
    const name =
      this.getPlainCropName(crop).toLowerCase();
    const type =
      String(crop?.type || '').trim().toLowerCase();

    if (!name || name === 'unnamed crop') {
      return '';
    }

    return `${name}|${type}`;
  }

  private getPlainCropName(crop: any) {
    const raw =
      String(crop?.name || 'Unnamed crop');
    const withoutSymbols =
      raw
        .replace(/[\uD800-\uDFFF]/g, '')
        .replace(/[\u2600-\u27BF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return withoutSymbols || 'Unnamed crop';
  }

  private getEntityId(entity: any) {
    return getScopedEntityId(entity);
  }

  private setCropTypeForForm(type: string) {
    const normalizedType =
      String(type || '').trim();

    if (!normalizedType) {
      this.cropType = 'Cereal';
      this.customCropType = '';
      return;
    }

    if (this.cropTypes.includes(normalizedType)) {
      this.cropType = normalizedType;
      this.customCropType = '';
      return;
    }

    this.cropType = 'Other';
    this.customCropType = normalizedType;
  }

  private getCropTypeForPayload() {
    if (this.cropType === 'Other') {
      return this.customCropType.trim() || 'Other';
    }

    return this.cropType.trim() || 'Other';
  }

  private buildCropPayload() {
    const lifecycleDays =
      Number(this.cropLifecycleDays) || 120;
    const cropType =
      this.getCropTypeForPayload();

    return {
      name: this.cropName.trim(),
      type: cropType,
      status: this.cropStatus,
      icon: this.getCropIcon({ name: this.cropName, type: cropType }),
      season: this.cropSeason || this.cropPlantingSeason || 'Year-round',
      farm: this.selectedFarm,
      lifecycleDays,
      ndviTarget: this.cropNdviTarget,
      moistureTarget: this.cropMoistureTarget,
      optimalTemperatureMin: this.cropTemperatureMin,
      optimalTemperatureMax: this.cropTemperatureMax,
      expectedYield: this.cropExpectedYield,
      plantingSeason: this.cropPlantingSeason || this.cropSeason,
      description: this.cropDescription,
      growthStages: this.cropGrowthStages.map(stage => ({
        name: stage.name,
        startDay: Number(stage.startDay) || 0,
        endDay: Number(stage.endDay) || 0
      }))
    };
  }

  private resetGrowthStages() {
    this.cropGrowthStages = this.normalizeGrowthStages([], 120);
  }

  private normalizeGrowthStages(stages: any[] = [], lifecycleDays = 120) {
    if (stages.length > 0) {
      return this.stageNames.map((name, index) => {
        const existing =
          stages.find(stage => stage.name === name) || stages[index];

        return {
          name,
          startDay: Number(existing?.startDay) || 0,
          endDay: Number(existing?.endDay) || 0
        };
      });
    }

    const totalDays =
      Number(lifecycleDays) || 120;
    const ranges = [
      [0, 8],
      [9, 18],
      [19, 28],
      [29, Math.round(totalDays * 0.55)],
      [Math.round(totalDays * 0.55) + 1, Math.round(totalDays * 0.75)],
      [Math.round(totalDays * 0.75) + 1, totalDays - 10],
      [Math.max(totalDays - 9, 1), totalDays]
    ];

    return this.stageNames.map((name, index) => ({
      name,
      startDay: ranges[index][0],
      endDay: ranges[index][1]
    }));
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private toNullableNumber(value: any) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number(value);
  }

  getCropIcon(crop: any) {
    const nameKey =
      String(crop?.name || '').trim().toLowerCase();
    const typeKey =
      String(crop?.type || '').trim().toLowerCase();

    return crop?.icon ||
      this.cropIconMap[nameKey] ||
      this.categoryIconMap[typeKey] ||
      '🌱';
  }

}
