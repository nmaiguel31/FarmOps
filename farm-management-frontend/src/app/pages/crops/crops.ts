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
    LucideTrash2
  ],
  templateUrl: './crops.html',
  styleUrl: './crops.css',
})
export class Crops implements OnInit {

  crops: any[] = [];
  farms: any[] = [];
  selectedCrop: any = null;
  cropsLoading = true;

  cropFormOpen = false;
  editingCropId = '';

  filterSearch = '';
  filterType = 'All';
  filterStatus = 'All';
  currentPage = 1;
  readonly pageSize = 8;

  cropName = '';
  cropType = '';
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
  cropIcon = '';
  selectedFarm = '';
  cropGrowthStages: GrowthStageForm[] = [];

  readonly cropTypes = [
    'Grain',
    'Legume',
    'Fiber',
    'Oilseed',
    'Cash Crop',
    'Vegetable',
    'Tree Crop',
    'Fruit',
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

  ngOnInit(): void {
    this.resetGrowthStages();
    this.loadFarms();
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

  loadCrops() {
    const startedAt =
      performance.now();
    this.cropsLoading = true;

    this.cropService.getCrops().subscribe({
      next: (data: any) => {
        this.crops = [...data];

        if (this.selectedCrop) {
          this.selectedCrop =
            this.crops.find(crop => crop._id === this.selectedCrop._id) ||
            this.crops[0] ||
            null;
        } else if (this.crops.length > 0) {
          this.selectedCrop = this.crops[0];
        }

        this.cropsLoading = false;
        console.info(
          `GET /api/crops completed in ${Math.round(performance.now() - startedAt)}ms`
        );
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.cropsLoading = false;
        console.info(
          `GET /api/crops failed after ${Math.round(performance.now() - startedAt)}ms`
        );
        this.cdr.detectChanges();
      }
    });
  }

  get filteredCrops() {
    const search =
      this.filterSearch.trim().toLowerCase();

    return this.crops.filter(crop => {
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
        this.crops
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
    return this.crops.length;
  }

  get mostPlantedCrop() {
    if (this.crops.length === 0) {
      return null;
    }

    return [...this.crops].sort(
      (a, b) => this.getFieldsCount(b) - this.getFieldsCount(a)
    )[0];
  }

  get averageLifecycle() {
    return this.average(
      this.crops
        .map(crop => Number(crop.lifecycleDays))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  get averageNdviTarget() {
    return this.average(
      this.crops
        .map(crop => Number(crop.ndviTarget))
        .filter(value => Number.isFinite(value) && value > 0)
    );
  }

  get averageMoistureTarget() {
    return this.average(
      this.crops
        .map(crop => Number(crop.moistureTarget))
        .filter(value => Number.isFinite(value) && value > 0)
    );
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

  openCreateCrop() {
    this.editingCropId = '';
    this.cropName = '';
    this.cropType = '';
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
    this.cropIcon = '';
    this.selectedFarm = this.farms[0]?._id || '';
    this.resetGrowthStages();
    this.cropFormOpen = true;
  }

  editCrop(crop: any) {
    this.editingCropId = crop._id;
    this.cropName = crop.name || '';
    this.cropType = crop.type || '';
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
    this.cropIcon = crop.icon || this.getCropIcon(crop);
    this.selectedFarm = crop.farm?._id || crop.farm || this.farms[0]?._id || '';
    this.cropGrowthStages =
      this.normalizeGrowthStages(crop.growthStages, crop.lifecycleDays || 120);
    this.cropFormOpen = true;
  }

  closeCropForm() {
    this.cropFormOpen = false;
  }

  createCrop() {
    this.cropService.createCrop(this.buildCropPayload()).subscribe({
      next: (crop: any) => {
        this.cropFormOpen = false;
        this.selectedCrop = crop;
        this.loadCrops();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        alert(error?.error?.message || 'Could not create crop.');
      }
    });
  }

  updateCrop() {
    this.cropService.updateCrop(
      this.editingCropId,
      this.buildCropPayload()
    ).subscribe({
      next: (crop: any) => {
        this.cropFormOpen = false;
        this.editingCropId = '';
        this.selectedCrop = crop;
        this.loadCrops();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        alert(error?.error?.message || 'Could not update crop.');
      }
    });
  }

  deleteCrop(id: string) {
    const confirmed =
      confirm('Are you sure you want to delete this crop? Fields using it will become unassigned.');

    if (!confirmed) {
      return;
    }

    this.cropService.deleteCrop(id).subscribe({
      next: () => {
        this.loadCrops();
      },
      error: (error) => {
        console.error(error);
        alert(error?.error?.message || 'Could not delete crop.');
      }
    });
  }

  exportCsv() {
    const headers = [
      'Name',
      'Icon',
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

    const rows = this.filteredCrops.map(crop => [
      crop.name,
      this.getCropIcon(crop),
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

    const csv = [headers, ...rows]
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
  }

  exportPdf() {
    const doc = new jsPDF();
    let y = 18;

    doc.setFontSize(18);
    doc.text('FarmOps Crop Templates', 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.text('Crop lifecycle templates and performance targets', 14, y);
    y += 12;

    this.filteredCrops.forEach((crop, index) => {
      if (y > 270) {
        doc.addPage();
        y = 18;
      }

      doc.setFontSize(11);
      doc.text(`${index + 1}. ${crop.name || 'Unnamed crop'}`, 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.text(`Icon: ${this.getCropIcon(crop)} | Type: ${crop.type || '-'} | Status: ${this.getCropStatus(crop)} | Lifecycle: ${crop.lifecycleDays || '-'} days`, 18, y);
      y += 5;
      doc.text(`NDVI: ${this.formatNdvi(crop.ndviTarget)} | Moisture: ${this.formatPercent(crop.moistureTarget)} | Fields: ${this.getFieldsCount(crop)}`, 18, y);
      y += 8;
    });

    doc.save('farmops-crops.pdf');
  }

  getCropStatus(crop: any) {
    return crop.status || 'Active';
  }

  getFieldsCount(crop: any) {
    return Number(crop.fieldsCount || 0);
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

  private buildCropPayload() {
    const lifecycleDays =
      Number(this.cropLifecycleDays) || 120;

    return {
      name: this.cropName.trim(),
      type: this.cropType.trim(),
      status: this.cropStatus,
      icon: this.cropIcon || this.getCropIcon({ name: this.cropName, type: this.cropType }),
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
