import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';

declare const google: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { Zone } from '../../services/zone';
import { Crop as CropService } from '../../services/crop';
import { GoogleMapsLoader } from '../../services/google-maps-loader';
import { WeatherInsights, WeatherService } from '../../services/weather';
import { OperationSignal } from '../../services/operation-signal';
import {
  LucideActivity,
  LucideCalendar,
  LucideDroplet,
  LucideFlower2,
  LucideGrape,
  LucideHeartPulse,
  LucideLeaf,
  LucideMap,
  LucidePencil,
  LucideRefreshCw,
  LucideShoppingBasket,
  LucideSprout,
  LucideTractor,
  LucideTrash2,
  LucideWaves
} from '@lucide/angular';

@Component({
  selector: 'app-farms',
  imports: [
    CommonModule,
    FormsModule,
    LucideActivity,
    LucideCalendar,
    LucideDroplet,
    LucideFlower2,
    LucideGrape,
    LucideHeartPulse,
    LucideLeaf,
    LucideMap,
    LucidePencil,
    LucideRefreshCw,
    LucideShoppingBasket,
    LucideSprout,
    LucideTractor,
    LucideTrash2,
    LucideWaves
  ],
  templateUrl: './farms.html',
  styleUrl: './farms.css',
})
export class Farms implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('locationInput')
  locationInput!: ElementRef;
  @ViewChild('farmLocationMap')
  farmLocationMap!: ElementRef;
  farms: any[] = [];
  filteredFarms: any[] = [];
  fields: any[] = [];
  zones: any[] = [];
  crops: any[] = [];
  selectedFarm: any = null;
  selectedField: any = null;
  selectedZone: any = null;
  expandedFarmIds = new Set<string>();
  showNearbyFarms = false;
  nearbyRadiusKm = 20;
  readonly nearbyRadiusOptions = [5, 10, 20, 50];

  searchLocation = '';
  searchOwner = '';
  fieldSearch = '';
  fieldFilter = 'All';
  cropSelectorSearch = '';
  farmName = '';
  farmLocation = '';
  farmSize = 0;
  farmLatitude = 0;
  farmLongitude = 0;
  farmBoundaryCoordinates: any[] = [];
  editingFarmId = '';
  farmFormOpen = false;
  fieldFormOpen = false;
  editingFieldId = '';
  fieldName = '';
  selectedCrop = '';
  fieldPlantingDate = '';
  fieldCurrentStage = 'Planning';
  fieldLifecycleError = '';
  fieldArea = 0;
  fieldStatus = 'Active';
  fieldHealthStatus = 'Good';
  fieldIrrigationStatus = 'Scheduled';
  fieldNotes = '';
  fieldBoundaryCoordinates: any[] = [];
  fieldBoundaryError = '';
  zoneFormOpen = false;
  editingZoneId = '';
  zoneName = '';
  zoneType = 'Monitoring';
  zoneArea = 0;
  zoneHealthScore = 0;
  zoneMoistureScore = 0;
  zoneNdviScore = 0;
  zoneRecommendation = '';
  zoneNotes = '';
  zoneBoundaryCoordinates: any[] = [];
  zoneBoundaryError = '';
  mapsReady = false;
  isDrawingFarmBoundary = false;
  isDrawingFieldBoundary = false;
  isDrawingZoneBoundary = false;
  weatherInsights: WeatherInsights | null = null;
  weatherLoading = false;
  weatherError = '';
  selectedMapLayer = this.getInitialMapLayer();
  readonly mapLayerOptions = [
    { label: 'Map', value: 'roadmap' },
    { label: 'Satellite', value: 'satellite' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'Terrain', value: 'terrain' },
    { label: 'NDVI', value: 'ndvi' }
  ];
  readonly lifecycleStages = [
    'Planning',
    'Land Preparation',
    'Planting',
    'Vegetative Growth',
    'Flowering',
    'Ripening',
    'Harvest'
  ];
  pendingLifecycleStage = 'Planning';
  lifecycleUpdateError = '';
  readonly lifecycleDurationDays = 120;
  private farmFormMap: any = null;
  private farmFormMarker: any = null;
  private farmFormPolygon: any = null;
  private farmBoundaryVertexMarkers: any[] = [];
  private fieldBoundaryMap: any = null;
  private fieldBoundaryPolygon: any = null;
  private fieldBoundaryVertexMarkers: any[] = [];
  private zoneBoundaryMap: any = null;
  private zoneBoundaryPolygon: any = null;
  private zoneBoundaryVertexMarkers: any[] = [];
  private ndviOverlays: any[] = [];
  private farmGeocoder: any = null;
  private activeMaps: any[] = [];
  private mapLayerButtonGroups: HTMLButtonElement[][] = [];
  private lifecycleClock: any = null;
  private pendingFarmId = '';
  private pendingFieldId = '';
  private weatherSignalGenerationInFlight = false;
  private lastWeatherSignalGenerationAt = 0;

  private mapsLoader = inject(GoogleMapsLoader);
  private route = inject(ActivatedRoute);
  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private zoneService = inject(Zone);
  private cropService = inject(CropService);
  private weatherService = inject(WeatherService);
  private operationSignalService = inject(OperationSignal);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {
      this.pendingFarmId =
        params.get('farmId') ||
        params.get('farm') ||
        '';
      this.pendingFieldId =
        params.get('fieldId') ||
        params.get('field') ||
        '';
      this.applyPendingSelection();
    });

    this.loadFarms();
    this.loadFields();
    this.loadZones();
    this.loadCrops();
    this.lifecycleClock = setInterval(() => {
      this.cdr.detectChanges();
    }, 60000);
  }

  ngOnDestroy(): void {

    if (this.lifecycleClock) {
      clearInterval(this.lifecycleClock);
    }

  }
  
  async ngAfterViewInit(): Promise<void> {

    await this.mapsLoader.load();
    this.mapsReady = true;

    const autocomplete =
      new google.maps.places.Autocomplete(
        this.locationInput.nativeElement
      );

    autocomplete.addListener('place_changed', () => {

      const place = autocomplete.getPlace();

      this.farmLocation =
        place.formatted_address || '';

      this.farmLatitude =
        place.geometry?.location?.lat() || 0;

      this.farmLongitude =
        place.geometry?.location?.lng() || 0;

      this.updateFarmFormMarker({
        lat: this.farmLatitude,
        lng: this.farmLongitude
      }, true);

      this.cdr.detectChanges();

    });

    this.renderSelectedFarmMap();

}

  createFarm() {

  const farmData = {
    name: this.farmName,
    location: this.farmLocation,
    latitude: this.farmLatitude,
    longitude: this.farmLongitude,
    size: this.farmSize,
    polygonCoordinates: this.farmBoundaryCoordinates
  };

  this.farmService.createFarm(farmData).subscribe({

    next: () => {

      this.farmName = '';
      this.farmLocation = '';
      this.farmSize = 0;
      this.farmLatitude = 0;
      this.farmLongitude = 0;
      this.farmBoundaryCoordinates = [];

      this.loadFarms();
      this.farmFormOpen = false;

    },

    error: (error) => console.error(error)

  });

}

editFarm(farm: any) {

  this.editingFarmId = farm._id;
  this.farmName = farm.name;
  this.farmLocation = farm.location;
  this.farmSize = farm.size;
  this.farmLatitude = farm.latitude;
  this.farmLongitude = farm.longitude;
  this.farmBoundaryCoordinates = farm.polygonCoordinates || [];
  this.farmFormOpen = true;

  setTimeout(() => {
    this.initializeFarmFormMap();
  }, 150);
}

updateFarm() {

  const farmData = {
    name: this.farmName,
    location: this.farmLocation,
    latitude: this.farmLatitude,
    longitude: this.farmLongitude,
    size: this.farmSize,
    polygonCoordinates: this.farmBoundaryCoordinates
  };

  this.farmService.updateFarm(
    this.editingFarmId,
    farmData
  ).subscribe({

    next: () => {

      this.editingFarmId = '';
      
      this.farmName = '';
      this.farmLocation = '';
      this.farmSize = 0;
      this.farmBoundaryCoordinates = [];

      this.loadFarms();
      this.farmFormOpen = false;

      this.cdr.detectChanges();

      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);

    },

    error: (error) => console.error(error)

  });

}
  loadFarms() {

    this.farmService.getFarms().subscribe({

      next: (data: any) => {

        this.farms = [...data];
        this.filteredFarms = [...data];
        if (this.pendingFarmId) {
          this.applyPendingSelection();
        } else if (!this.selectedFarm && this.farms.length > 0) {
          this.selectFarm(this.farms[0]);
        } else if (this.selectedFarm) {
          this.selectedFarm =
            this.farms.find(farm => farm._id === this.selectedFarm._id) ||
            this.farms[0] ||
            null;
        }

        this.renderSelectedFarmMap();
        this.loadWeatherForSelection();
        this.cdr.detectChanges();

      },

      error: (error) => {
        this.fieldBoundaryError = error?.error?.message || 'Unable to save field boundary.';
        this.cdr.detectChanges();
      }

    });

  }

  loadFields() {

    this.fieldService.getFields().subscribe({

      next: (data: any) => {

        this.fields = [...data];
        this.syncSelectedField();
        this.applyPendingSelection();
        this.renderSelectedFarmMap();
        this.loadWeatherForSelection();
        this.cdr.detectChanges();

      },

      error: (error) => {
        this.fieldBoundaryError = error?.error?.message || 'Unable to update field boundary.';
        this.cdr.detectChanges();
      }

    });

  }

  loadZones() {

    this.zoneService.getZones().subscribe({

      next: (data: any) => {

        this.zones = [...data];
        this.syncSelectedZone();
        this.renderSelectedFarmMap();
        this.cdr.detectChanges();

      },

      error: (error) => {
        this.zoneBoundaryError = error?.error?.message || 'Unable to save zone boundary.';
        this.cdr.detectChanges();
      }

    });

  }

  loadCrops() {

    this.fieldService.getCrops().subscribe({

      next: (data: any) => {

        this.crops = [...data];
        this.cdr.detectChanges();

      },

      error: (error) => {
        this.zoneBoundaryError = error?.error?.message || 'Unable to update zone boundary.';
        this.cdr.detectChanges();
      }

    });

  }

  get selectedFarmFields() {
    if (!this.selectedFarm) {
      return [];
    }

    return this.fields.filter(field =>
      (field.farm?._id || field.farm) === this.selectedFarm._id
    );
  }

  get selectedFieldZones() {
    if (!this.selectedField) {
      return [];
    }

    return this.zones.filter(zone =>
      (zone.field?._id || zone.field) === this.selectedField._id
    );
  }

  get totalSelectedFieldArea() {
    return this.selectedFarmFields
      .reduce((sum, field) => sum + Number(field.area || 0), 0);
  }

  formatArea(value: any) {

    const area = Number(value || 0);
    return Number.isFinite(area) ? area.toFixed(2) : '0.00';

  }

  formatWeatherValue(value: any, suffix = '') {

    const metric = Number(value);
    return Number.isFinite(metric) ? `${Math.round(metric)}${suffix}` : '--';

  }

  formatForecastDate(date: string) {

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }
    );

  }

  getWeatherTargetName() {

    return this.selectedField?.name || this.selectedFarm?.name || 'selected farm';

  }

  getRainRiskClass(value: any) {

    const rain = Number(value || 0);

    if (rain >= 70) {
      return 'rain-high';
    }

    if (rain >= 35) {
      return 'rain-medium';
    }

    return 'rain-low';

  }

  getRainRiskColor(value: any) {

    const risk = this.getRainRiskClass(value);

    if (risk === 'rain-high') {
      return '#fca5a5';
    }

    if (risk === 'rain-medium') {
      return '#f6c453';
    }

    return '#bbf7d0';

  }

  getRainRiskBg(value: any) {

    const risk = this.getRainRiskClass(value);

    if (risk === 'rain-high') {
      return '#fee2e2';
    }

    if (risk === 'rain-medium') {
      return '#fff3cf';
    }

    return '#eef8ef';

  }

  getWeatherInsight() {

    if (!this.weatherInsights) {
      return '';
    }

    if (this.hasHighRainRisk()) {
      return 'Rain is likely soon. Consider delaying irrigation.';
    }

    if (this.weatherInsights.windSpeed >= 30) {
      return 'Wind may affect spraying operations.';
    }

    return 'Conditions look stable for field operations.';

  }

  getWeatherInsightTitle() {

    if (!this.weatherInsights) {
      return 'Field Recommendation';
    }

    if (this.hasHighRainRisk()) {
      return 'Rain expected within 48 hours';
    }

    if (this.weatherInsights.windSpeed >= 30) {
      return 'Wind advisory';
    }

    return 'Field Recommendation';

  }

  getWeatherInsightIcon() {

    if (this.hasHighRainRisk()) {
      return '\u26A0\uFE0F';
    }

    if (this.weatherInsights && this.weatherInsights.windSpeed >= 30) {
      return '\uD83C\uDF2C\uFE0F';
    }

    return '\uD83C\uDF31';

  }

  getForecastIcon(condition: string) {

    const value = (condition || '').toLowerCase();

    if (value.includes('storm')) {
      return '\u26C8\uFE0F';
    }

    if (value.includes('rain') || value.includes('drizzle')) {
      return '\uD83C\uDF27\uFE0F';
    }

    if (value.includes('cloud') || value.includes('fog')) {
      return '\u2601\uFE0F';
    }

    return '\u2600\uFE0F';

  }

  getConditionAccent(condition: string) {

    const value = (condition || '').toLowerCase();

    if (value.includes('storm')) {
      return '#fff3cf';
    }

    if (value.includes('rain') || value.includes('drizzle')) {
      return '#fee2e2';
    }

    if (value.includes('cloud') || value.includes('fog')) {
      return '#e8f2ff';
    }

    return '#fff8d7';

  }

  getOperationalRecommendations() {

    if (!this.weatherInsights) {
      return [];
    }

    const recommendations = ['Inspection'];

    if (this.weatherInsights.rainProbability < 70) {
      recommendations.unshift('Irrigation');
    }

    if (this.weatherInsights.windSpeed < 30 && this.weatherInsights.rainProbability < 50) {
      recommendations.splice(1, 0, 'Fertilization');
    }

    return recommendations;

  }

  private hasHighRainRisk() {

    if (!this.weatherInsights) {
      return false;
    }

    return this.weatherInsights.rainProbability >= 70 ||
      this.weatherInsights.forecast.slice(0, 2)
        .some(day => day.rainProbability >= 70);

  }

  get selectedFieldCropLabel() {
    return this.selectedField
      ? this.getFieldCropLabel(this.selectedField)
      : 'No crop assigned';
  }

  get selectedFieldHealthIndex() {
    return this.selectedField ? this.getFieldHealthIndex(this.selectedField) : null;
  }

  get selectedFieldHealthIndexLabel() {
    return this.formatHealthIndex(this.selectedFieldHealthIndex);
  }

  get selectedFieldHealthStatus() {
    return this.selectedField
      ? this.getFieldHealthStatus(this.selectedField)
      : 'No crop assigned';
  }

  get selectedFieldSoilMoisture() {
    if (!this.selectedField) {
      return 0;
    }

    return this.getFieldSoilMoisture(this.selectedField);
  }

  getFieldSoilMoisture(field: any) {

    const explicitMoisture =
      Number(field?.soilMoisture ?? field?.moistureScore);

    if (Number.isFinite(explicitMoisture) && explicitMoisture > 0) {
      return this.clampHealthScore(explicitMoisture);
    }

    if (field?.irrigationStatus === 'Dry') {
      return 38;
    }

    if (field?.irrigationStatus === 'Irrigated') {
      return 84;
    }

    return 68;
  }

  get selectedFieldNdviScore() {
    return this.selectedField ? this.getFieldNdviScore(this.selectedField) : 0;
  }

  get selectedFieldVegetationStatus() {
    return this.getVegetationStatus(this.selectedFieldNdviScore);
  }

  get selectedFieldNdviTone() {
    return this.getNdviTone(this.selectedFieldNdviScore);
  }

  private loadWeatherForSelection() {

    const coordinates = this.getWeatherCoordinates();

    this.weatherInsights = null;
    this.weatherError = '';

    if (!coordinates) {
      this.weatherLoading = false;
      this.weatherError =
        'Add farm coordinates or draw a field boundary to load weather insights.';
      this.cdr.detectChanges();
      return;
    }

    this.weatherLoading = true;

    this.weatherService.getWeather(coordinates.lat, coordinates.lng)
      .subscribe({
        next: (weather) => {
          this.weatherInsights = weather;
          this.weatherLoading = false;
          this.weatherError = '';
          this.generateWeatherOperationSignals();
          this.cdr.detectChanges();
        },
        error: () => {
          this.weatherInsights = null;
          this.weatherLoading = false;
          this.weatherError =
            'Weather data is temporarily unavailable for this location.';
          this.cdr.detectChanges();
        }
      });

  }

  private generateWeatherOperationSignals() {
    const now =
      Date.now();

    if (
      this.weatherSignalGenerationInFlight ||
      now - this.lastWeatherSignalGenerationAt < 60000
    ) {
      return;
    }

    this.weatherSignalGenerationInFlight = true;
    this.lastWeatherSignalGenerationAt = now;

    this.operationSignalService.generateSignals().subscribe({
      next: () => {
        this.weatherSignalGenerationInFlight = false;
      },
      error: (error) => {
        console.error(error);
        this.weatherSignalGenerationInFlight = false;
      }
    });
  }

  private getWeatherCoordinates() {

    const fieldCoordinates =
      this.getFieldWeatherCoordinates(this.selectedField);

    if (fieldCoordinates) {
      return fieldCoordinates;
    }

    const farmLat = Number(this.selectedFarm?.latitude);
    const farmLng = Number(this.selectedFarm?.longitude);

    if (Number.isFinite(farmLat) && Number.isFinite(farmLng) && farmLat && farmLng) {
      return {
        lat: farmLat,
        lng: farmLng
      };
    }

    return null;

  }

  private getFieldWeatherCoordinates(field: any) {

    if (!field) {
      return null;
    }

    const lat = Number(field.latitude);
    const lng = Number(field.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) {
      return { lat, lng };
    }

    const polygonCoordinates =
      field.polygonCoordinates || [];

    if (!polygonCoordinates.length) {
      return null;
    }

    const center = polygonCoordinates.reduce(
      (sum: any, point: any) => ({
        lat: sum.lat + Number(point.lat || 0),
        lng: sum.lng + Number(point.lng || 0)
      }),
      { lat: 0, lng: 0 }
    );

    return {
      lat: center.lat / polygonCoordinates.length,
      lng: center.lng / polygonCoordinates.length
    };

  }

  getFieldCountForFarm(farm: any) {

    return this.fields.filter(field =>
      (field.farm?._id || field.farm) === farm._id
    ).length;

  }

  findNearbyFarms() {

    this.showNearbyFarms = true;

  }

  viewNearbyFarm(farm: any) {

    this.showNearbyFarms = false;
    this.selectFarm(farm);

  }

  get nearbyFarmResults() {

    if (!this.selectedFarm || !this.hasValidFarmCoordinates(this.selectedFarm)) {
      return [];
    }

    return this.farms
      .filter(farm =>
        farm._id !== this.selectedFarm._id &&
        this.hasValidFarmCoordinates(farm)
      )
      .map(farm => ({
        farm,
        distanceKm: this.calculateFarmDistanceKm(this.selectedFarm, farm)
      }))
      .filter(result => result.distanceKm <= this.nearbyRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

  }

  hasValidFarmCoordinates(farm: any) {

    const latitude =
      Number(farm?.latitude);
    const longitude =
      Number(farm?.longitude);

    return Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180 &&
      !(latitude === 0 && longitude === 0);

  }

  calculateFarmDistanceKm(originFarm: any, destinationFarm: any) {

    const earthRadiusKm = 6371;
    const originLat =
      this.toRadians(Number(originFarm.latitude));
    const destinationLat =
      this.toRadians(Number(destinationFarm.latitude));
    const latitudeDelta =
      this.toRadians(Number(destinationFarm.latitude) - Number(originFarm.latitude));
    const longitudeDelta =
      this.toRadians(Number(destinationFarm.longitude) - Number(originFarm.longitude));
    const haversineValue =
      Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
      Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
    const angularDistance =
      2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

    return earthRadiusKm * angularDistance;

  }

  formatDistance(distanceKm: number) {

    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`;

  }

  private toRadians(value: number) {

    return value * (Math.PI / 180);

  }

  getCropsForSelectedFarm() {

    if (!this.selectedFarm) {
      return [];
    }

    const search =
      this.cropSelectorSearch.trim().toLowerCase();

    return this.crops
      .filter(crop =>
        (crop.farm?._id || crop.farm) === this.selectedFarm._id
      )
      .filter(crop => {
        if (!search) {
          return true;
        }

        return `${crop.name || ''} ${crop.type || ''}`
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) =>
        String(a.type || '').localeCompare(String(b.type || '')) ||
        String(a.name || '').localeCompare(String(b.name || ''))
      );

  }

  getGroupedCropsForSelectedFarm() {

    const groups = new Map<string, any[]>();

    this.getCropsForSelectedFarm().forEach(crop => {
      const type =
        crop.type || 'Other';

      if (!groups.has(type)) {
        groups.set(type, []);
      }

      groups.get(type)?.push(crop);
    });

    return Array.from(groups.entries()).map(([type, crops]) => ({
      type,
      crops
    }));

  }

  getFieldsForFarm(farm: any) {

    return this.fields.filter(field => {

      const belongsToFarm =
        (field.farm?._id || field.farm) === farm._id;

      const searchValue =
        `${field.name || ''} ${this.getFieldCropLabel(field)} ${field.status || ''}`
          .toLowerCase();

      const matchesSearch =
        searchValue.includes(this.fieldSearch.toLowerCase());

      const matchesFilter =
        this.fieldFilter === 'All' ||
        field.status === this.fieldFilter ||
        this.getFieldCropLabel(field) === this.fieldFilter;

      return belongsToFarm && matchesSearch && matchesFilter;

    });

  }

  setFieldFilter(filter: string) {

    this.fieldFilter = filter;

  }
  deleteFarm(id: string) {

    const confirmed = confirm(
      'Are you sure you want to delete this farm?'
    );

    if (!confirmed) {
      return;
    }

    this.farmService.deleteFarm(id).subscribe({

      next: () => {

        if (this.selectedFarm?._id === id) {
          this.selectedFarm = null;
          this.selectedField = null;
        }

        this.loadFarms();

        setTimeout(() => {
        this.cdr.detectChanges();
        }, 100);

      },

      error: (error) => {
        this.fieldLifecycleError =
          error?.error?.message || 'Unable to update field.';
        console.error(error);
      }

    });

  }

  selectFarm(farm: any) {

    this.selectedFarm = farm;
    this.showNearbyFarms = false;
    this.expandedFarmIds.add(farm._id);
    this.syncSelectedField();
    this.renderSelectedFarmMap();
    this.loadWeatherForSelection();

  }

  selectField(field: any) {

    this.selectedField = field;
    this.syncSelectedZone();
    this.pendingLifecycleStage = this.getSelectedCropStage();
    if (field.farm?._id || field.farm) {
      this.expandedFarmIds.add(field.farm?._id || field.farm);
    }
    this.renderSelectedFarmMap();
    this.loadWeatherForSelection();
    this.cdr.detectChanges();

  }

  selectZone(zone: any) {

    this.selectedZone = zone;
    this.renderSelectedFarmMap();
    this.cdr.detectChanges();

  }

  toggleFarm(farm: any) {

    const wasExpanded =
      this.expandedFarmIds.has(farm._id);

    this.selectFarm(farm);

    if (wasExpanded) {
      this.expandedFarmIds.delete(farm._id);
      return;
    }

    this.expandedFarmIds.add(farm._id);

  }

  isFarmExpanded(farm: any) {

    return this.expandedFarmIds.has(farm._id);

  }

  createField() {

    if (!this.selectedFarm) {
      return;
    }

    if (!this.validateFieldLifecycleBeforeSave()) {
      return;
    }

    if (!this.validateFieldBoundaryBeforeSave()) {
      return;
    }

    this.fieldService.createField(
      this.getFieldData()
    ).subscribe({

      next: () => {

        this.resetFieldForm();
        this.fieldFormOpen = false;
        this.loadFields();
        this.loadCrops();
        this.renderSelectedFarmMap();

      },

      error: (error) => {
        this.fieldLifecycleError =
          error?.error?.message || 'Unable to create field.';
        console.error(error);
      }

    });

  }

  editField(field: any) {

    const allowedFieldStatuses =
      ['Active', 'Resting', 'Harvested'];

    this.editingFieldId = field._id;
    this.fieldName = field.name;
    this.selectedCrop = field.crop?._id || field.crop || '';
    const crop =
      field.crop?._id
        ? field.crop
        : this.crops.find(item => item._id === field.crop);
    this.fieldPlantingDate =
      crop?.plantingDate ? this.toDateInputValue(crop.plantingDate) : '';
    this.fieldCurrentStage =
      crop?.currentStage || 'Planning';
    this.fieldArea = field.area || 0;
    this.fieldStatus =
      allowedFieldStatuses.includes(field.status) ? field.status : 'Active';
    this.fieldHealthStatus = field.healthStatus || 'Good';
    this.fieldIrrigationStatus = field.irrigationStatus || 'Scheduled';
    this.fieldNotes = field.notes || '';
    this.fieldBoundaryCoordinates = field.polygonCoordinates || [];
    this.onFieldCropAssignmentChange();
    this.fieldFormOpen = true;

    setTimeout(() => {
      this.initializeFieldBoundaryMap();
    }, 150);

  }

  updateField() {

    if (!this.validateFieldLifecycleBeforeSave()) {
      return;
    }

    if (!this.validateFieldBoundaryBeforeSave()) {
      return;
    }

    this.fieldService.updateField(
      this.editingFieldId,
      this.getFieldData()
    ).subscribe({

      next: () => {

        this.resetFieldForm();
        this.fieldFormOpen = false;
        this.loadFields();
        this.loadCrops();
        this.renderSelectedFarmMap();

      },

      error: (error) => console.error(error)

    });

  }

  deleteField(id: string) {

    const confirmed = confirm(
      'Are you sure you want to delete this field?'
    );

    if (!confirmed) {
      return;
    }

    this.fieldService.deleteField(id).subscribe({

      next: () => {

        if (this.selectedField?._id === id) {
          this.selectedField = null;
        }

        this.loadFields();
        this.renderSelectedFarmMap();

      },

      error: (error) => console.error(error)

    });

  }

  createZone() {

    if (!this.selectedField) {
      return;
    }

    if (!this.validateZoneBoundaryBeforeSave()) {
      return;
    }

    this.zoneService.createZone(
      this.getZoneData()
    ).subscribe({

      next: () => {
        this.resetZoneForm();
        this.zoneFormOpen = false;
        this.loadZones();
      },

      error: (error) => console.error(error)

    });

  }

  editZone(zone: any) {

    this.editingZoneId = zone._id;
    this.zoneName = zone.name;
    this.zoneType = zone.zoneType || 'Monitoring';
    this.zoneArea = zone.area || 0;
    this.zoneHealthScore = zone.healthScore || 0;
    this.zoneMoistureScore = zone.moistureScore || 0;
    this.zoneNdviScore = zone.ndviScore || 0;
    this.zoneRecommendation = zone.recommendation || '';
    this.zoneNotes = zone.notes || '';
    this.zoneBoundaryCoordinates = zone.polygonCoordinates || [];
    this.zoneFormOpen = true;

    setTimeout(() => {
      this.initializeZoneBoundaryMap();
    }, 150);

  }

  updateZone() {

    if (!this.editingZoneId) {
      return;
    }

    if (!this.validateZoneBoundaryBeforeSave()) {
      return;
    }

    this.zoneService.updateZone(
      this.editingZoneId,
      this.getZoneData()
    ).subscribe({

      next: () => {
        this.resetZoneForm();
        this.zoneFormOpen = false;
        this.loadZones();
      },

      error: (error) => console.error(error)

    });

  }

  deleteZone(id: string) {

    if (!confirm('Delete this zone?')) {
      return;
    }

    this.zoneService.deleteZone(id).subscribe({
      next: () => {
        if (this.selectedZone?._id === id) {
          this.selectedZone = null;
        }

        this.loadZones();
      },

      error: (error) => {
        this.lifecycleUpdateError =
          error?.error?.message || 'Unable to update crop stage.';
        console.error(error);
      }
    });

  }

  openCreateField() {

    if (!this.selectedFarm) {
      return;
    }

    this.resetFieldForm();
    this.fieldFormOpen = true;

    setTimeout(() => {
      this.initializeFieldBoundaryMap();
    }, 150);

  }

  openCreateZone() {

    if (!this.selectedField) {
      return;
    }

    this.resetZoneForm();
    this.zoneFormOpen = true;

    setTimeout(() => {
      this.initializeZoneBoundaryMap();
    }, 150);

  }

  closeFieldForm() {

    this.fieldFormOpen = false;
    this.isDrawingFieldBoundary = false;
    this.fieldBoundaryError = '';
    this.fieldLifecycleError = '';

  }

  closeZoneForm() {

    this.zoneFormOpen = false;
    this.isDrawingZoneBoundary = false;
    this.zoneBoundaryError = '';

  }

  openAddMapArea() {

    alert('Map area drawing will be added in a later phase.');

  }

  getFieldCropLabel(field: any) {

    return field.crop?.name || field.cropType || 'No crop assigned';

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

  getBadgeClass(value: string) {

    return (value || 'unknown')
      .toLowerCase()
      .replace(/\s+/g, '-');

  }

  getLifecycleState(index: number) {

    const currentIndex =
      this.lifecycleStages.indexOf(this.getSelectedCropStage());

    if (index < currentIndex) {
      return 'complete';
    }

    if (index === currentIndex) {
      return 'current';
    }

    return 'pending';

  }

  getStageDateRange(index: number) {

    const crop =
      this.getSelectedCrop();
    const templateStage =
      crop?.growthStages?.[index];
    const plantingDate =
      crop?.plantingDate;

    if (!plantingDate) {
      return 'Not available';
    }

    const start = new Date(plantingDate);

    if (Number.isNaN(start.getTime())) {
      return 'Not available';
    }

    if (templateStage) {
      const stageStart =
        new Date(start.getTime() + ((Number(templateStage.startDay) || 0) * 86400000));
      const stageEnd =
        new Date(start.getTime() + ((Number(templateStage.endDay) || 0) * 86400000));
      const dateFormat =
        { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions;

      return `${stageStart.toLocaleDateString('en-US', dateFormat)} - ${stageEnd.toLocaleDateString('en-US', dateFormat)}`;
    }

    const lifecycleDays =
      Number(crop?.lifecycleDays) || this.lifecycleDurationDays;
    const daysPerStage =
      Math.max(Math.round(lifecycleDays / this.lifecycleStages.length), 1);
    const stageStart =
      new Date(start.getTime() + (index * daysPerStage * 86400000));
    const stageEnd =
      new Date(stageStart.getTime() + ((daysPerStage - 1) * 86400000));
    const dateFormat =
      { month: 'short', day: 'numeric' } as Intl.DateTimeFormatOptions;

    return `${stageStart.toLocaleDateString('en-US', dateFormat)} - ${stageEnd.toLocaleDateString('en-US', dateFormat)}`;

  }

  getFieldValueTone(type: string, value: any) {

    const normalized =
      String(value || '').toLowerCase();

    if (type === 'health') {
      if (normalized.includes('critical') || normalized.includes('poor')) {
        return 'tone-danger';
      }

      if (normalized.includes('watch') || normalized.includes('fair') || normalized.includes('warning')) {
        return 'tone-warning';
      }

      return 'tone-success';
    }

    if (type === 'irrigation') {
      if (normalized.includes('dry') || normalized.includes('paused')) {
        return 'tone-warning';
      }

      if (normalized.includes('irrigated') || normalized.includes('scheduled')) {
        return 'tone-blue';
      }

      return 'tone-success';
    }

    if (type === 'crop') {
      if (normalized.includes('active') || normalized.includes('harvested') || normalized.includes('planned')) {
        return 'tone-success';
      }

      if (normalized.includes('resting')) {
        return 'tone-muted';
      }

      return 'tone-success';
    }

    return '';

  }

  getMoistureTone(value: number) {

    if (value < 30) {
      return 'tone-danger';
    }

    if (value < 60) {
      return 'tone-warning';
    }

    return 'tone-blue';

  }

  getIndexTone(value: number | null) {

    if (value === null) {
      return 'tone-muted';
    }

    if (value < 50) {
      return 'tone-danger';
    }

    if (value < 75) {
      return 'tone-warning';
    }

    return 'tone-success';

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

    if (this.hasHighRainRisk()) {
      health -= 10;
    }

    return this.clampHealthScore(health);

  }

  getFieldHealthStatus(field: any) {

    const status =
      String(field?.status || '').toLowerCase();

    if (status.includes('resting')) {
      return 'No active crop health';
    }

    if (status.includes('harvested')) {
      return 'Harvested';
    }

    if (!this.fieldHasCrop(field)) {
      return 'No crop assigned';
    }

    return this.getHealthStatusFromIndex(this.getFieldHealthIndex(field));

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
      normalized.includes('warning')
    ) {
      return 55;
    }

    return 91;

  }

  getFieldNdviScore(field: any) {

    return this.getFieldManualNdviScore(field);

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

  getHealthStatusFromIndex(value: number | null) {

    if (value === null) {
      return 'Not available';
    }

    if (value >= 80) {
      return 'Good';
    }

    if (value >= 60) {
      return 'Moderate';
    }

    if (value >= 40) {
      return 'Warning';
    }

    return 'Critical';

  }

  formatHealthIndex(value: number | null) {

    return value === null ? 'Not available' : `${value}%`;

  }

  getFieldFormHealthPreview() {

    const previewField = {
      crop: this.selectedCrop || null,
      cropType: '',
      healthStatus: this.fieldHealthStatus,
      irrigationStatus: this.fieldIrrigationStatus,
      status: this.fieldStatus
    };
    const score =
      this.getFieldHealthIndex(previewField);

    if (score === null) {
      return this.getFieldHealthStatus(previewField);
    }

    return `${score}% - ${this.getHealthStatusFromIndex(score)}`;

  }

  getVegetationStatus(score: number) {

    if (score <= 30) {
      return 'Poor vegetation';
    }

    if (score <= 60) {
      return 'Moderate vegetation';
    }

    if (score <= 80) {
      return 'Healthy vegetation';
    }

    return 'Excellent vegetation';

  }

  getNdviTone(score: number) {

    if (score <= 30) {
      return 'tone-danger';
    }

    if (score <= 60) {
      return 'tone-warning';
    }

    if (score <= 80) {
      return 'tone-success';
    }

    return 'tone-excellent';

  }

  getFieldRecommendations() {

    if (!this.selectedField) {
      return [];
    }

    const recommendations: Array<{
      title: string;
      priority: 'Low' | 'Medium' | 'High';
      reason: string;
      action: string;
    }> = [];
    const healthIndex =
      this.selectedFieldHealthIndex;
    const soilMoisture =
      this.selectedFieldSoilMoisture;
    const ndviScore =
      this.selectedFieldNdviScore;
    const rainProbability =
      this.weatherInsights?.rainProbability ?? null;
    const lifecycleStage =
      this.getSelectedCropStage();
    const cropStatus =
      String(this.selectedField.status || '').toLowerCase();

    if (
      soilMoisture < 40 &&
      (rainProbability === null || rainProbability < 40)
    ) {
      recommendations.push({
        title: 'Irrigation recommended',
        priority: 'High',
        reason: `Soil moisture is ${soilMoisture}% and near-term rain probability is ${this.formatRecommendationRain(rainProbability)}.`,
        action: 'Schedule irrigation for this field and recheck soil moisture after watering.'
      });
    }

    if (rainProbability !== null && rainProbability > 70) {
      recommendations.push({
        title: 'Delay irrigation',
        priority: 'Medium',
        reason: `Rain probability is ${rainProbability}%, which may naturally increase soil moisture soon.`,
        action: 'Postpone irrigation and monitor conditions after the rainfall window.'
      });
    }

    if ((healthIndex !== null && healthIndex < 50) || ndviScore < 50) {
      recommendations.push({
        title: 'Field inspection needed',
        priority: 'High',
        reason: `Health index is ${this.formatHealthIndex(healthIndex)} and NDVI score is ${ndviScore}%, indicating possible crop stress.`,
        action: 'Inspect the field for pests, disease, nutrient deficiency, irrigation gaps or uneven growth.'
      });
    }

    if (
      lifecycleStage === 'Flowering' ||
      lifecycleStage === 'Ripening'
    ) {
      recommendations.push({
        title: 'Increase crop monitoring',
        priority: 'Medium',
        reason: `${lifecycleStage} is a sensitive lifecycle stage for yield quality and harvest timing.`,
        action: 'Check crop condition more frequently and avoid disruptive operations when possible.'
      });
    }

    if (cropStatus.includes('harvested')) {
      recommendations.push({
        title: 'Review harvest outcome',
        priority: 'Low',
        reason: 'This field is marked as harvested, so operational focus can shift to performance review.',
        action: 'Review yield notes, update crop records and compare revenue or expenses in financial records.'
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        title: 'No urgent action required',
        priority: 'Low',
        reason: 'Field health, moisture, vegetation and weather indicators are within stable operating ranges.',
        action: 'Continue routine inspection and keep monitoring weather, lifecycle and NDVI changes.'
      });
    }

    return recommendations;

  }

  getRecommendationPriorityClass(priority: string) {

    return `priority-${String(priority || 'low').toLowerCase()}`;

  }

  private formatRecommendationRain(value: number | null) {

    return value === null ? 'not available' : `${value}%`;

  }

  getSelectedCrop() {

    const crop = this.selectedField?.crop;

    if (crop?._id) {
      return crop;
    }

    return this.crops.find(item => item._id === crop) || null;

  }

  getSelectedCropStage() {

    return this.getSelectedCrop()?.currentStage || 'Planning';

  }

  hasFieldCropAssignment() {

    return Boolean(this.selectedCrop);

  }

  onFieldCropAssignmentChange() {

    if (!this.hasFieldCropAssignment()) {
      this.fieldLifecycleError = '';
      return;
    }

    if (
      this.fieldCurrentStage === 'Planning' &&
      !this.fieldPlantingDate
    ) {
      this.fieldPlantingDate = this.toDateInputValue(new Date());
    }

  }

  onFieldStageChange(stage: string) {

    this.fieldCurrentStage = stage;
    this.fieldLifecycleError = '';
    this.onFieldCropAssignmentChange();

  }

  isPlantingDateRequiredForStage(stage: string) {

    return this.lifecycleStages.indexOf(stage) >=
      this.lifecycleStages.indexOf('Planting');

  }

  validateFieldLifecycleBeforeSave() {

    this.fieldLifecycleError = '';

    if (
      this.hasFieldCropAssignment() &&
      this.isPlantingDateRequiredForStage(this.fieldCurrentStage) &&
      !this.fieldPlantingDate
    ) {
      this.fieldLifecycleError =
        'Planting date is required for this crop stage.';
      return false;
    }

    return true;

  }

  shouldShowLifecycleTracking() {

    return this.selectedField?.status === 'Active' &&
      Boolean(this.getSelectedCrop());

  }

  getLifecycleUnavailableTitle() {

    if (this.selectedField?.status === 'Resting') {
      return 'No active crop cycle';
    }

    if (this.selectedField?.status === 'Harvested') {
      return 'Crop cycle completed';
    }

    return 'No crop assigned';

  }

  getLifecycleUnavailableMessage() {

    if (this.selectedField?.status === 'Resting') {
      return 'This field is currently resting.';
    }

    if (this.selectedField?.status === 'Harvested') {
      return 'This field has been harvested. Start a new crop cycle to enable lifecycle tracking.';
    }

    return 'Assign or create a crop for this field to enable lifecycle tracking.';

  }

  getSelectedCropProgress() {

    const currentIndex =
      Math.max(this.lifecycleStages.indexOf(this.getSelectedCropStage()), 0);

    if (this.getSelectedCropStage() === 'Harvest') {
      return 100;
    }

    return Math.round((currentIndex / (this.lifecycleStages.length - 1)) * 100);

  }

  getSelectedCropDaysInStage() {

    const startedAt =
      this.getSelectedCrop()?.stageStartedAt;

    if (!startedAt) {
      return 0;
    }

    const start = new Date(startedAt).getTime();
    const now = Date.now();

    if (!Number.isFinite(start)) {
      return 0;
    }

    return Math.max(Math.floor((now - start) / 86400000), 0);

  }

  formatLifecycleDate(date: any) {

    if (!date) {
      return 'Not available';
    }

    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );

  }

  toDateInputValue(date: any) {

    if (!date) {
      return '';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toISOString().slice(0, 10);

  }

  getCalculatedExpectedHarvestDate() {

    const crop = this.getSelectedCrop();
    const existingDate = crop?.expectedHarvestDate;

    if (existingDate) {
      return existingDate;
    }

    const plantingDate = crop?.plantingDate;

    if (!plantingDate) {
      return null;
    }

    const plantedAt = new Date(plantingDate);

    if (Number.isNaN(plantedAt.getTime())) {
      return null;
    }

    plantedAt.setDate(
      plantedAt.getDate() +
      (Number(crop?.lifecycleDays) || this.lifecycleDurationDays)
    );
    return plantedAt.toISOString();

  }

  getLifecycleInfoCards() {

    return [
      {
        label: 'Planting Date',
        value: this.formatLifecycleDate(this.getSelectedCrop()?.plantingDate),
        note: 'Crop start date',
        icon: 'planting'
      },
      {
        label: 'Current Stage',
        value: this.getSelectedCropStage(),
        note: 'Tracked on crop record',
        icon: 'stage'
      },
      {
        label: 'Days in Stage',
        value: `${this.getSelectedCropDaysInStage()} days`,
        note: 'Auto-calculated',
        icon: 'days'
      },
      {
        label: 'Expected Harvest',
        value: this.formatLifecycleDate(this.getCalculatedExpectedHarvestDate()),
        note: this.getSelectedCrop()?.expectedHarvestDate ? 'Crop schedule' : 'Auto-calculated when possible',
        icon: 'harvest'
      }
    ];

  }

  setPendingLifecycleStage(stage: string) {

    if (this.lifecycleStages.includes(stage)) {
      this.pendingLifecycleStage = stage;
      this.lifecycleUpdateError = '';
    }

  }

  updateSelectedCropStage() {

    const crop = this.getSelectedCrop();
    const stage = this.pendingLifecycleStage;

    if (!crop || !this.lifecycleStages.includes(stage)) {
      return;
    }

    const plantingDate =
      crop.plantingDate || undefined;

    if (
      this.isPlantingDateRequiredForStage(stage) &&
      !plantingDate
    ) {
      this.lifecycleUpdateError =
        'Planting date is required for this crop stage.';
      return;
    }

    let expectedHarvestDate = crop.expectedHarvestDate || undefined;

    if (!expectedHarvestDate && plantingDate) {
      const harvestDate = new Date(plantingDate);
      harvestDate.setDate(
        harvestDate.getDate() +
        (Number(crop.lifecycleDays) || this.lifecycleDurationDays)
      );
      expectedHarvestDate = harvestDate.toISOString();
    }

    const stageStartedAt =
      stage === crop.currentStage
        ? crop.stageStartedAt || new Date().toISOString()
        : new Date().toISOString();

    const payload = {
      name: crop.name,
      type: crop.type,
      season: crop.season,
      farm: crop.farm?._id || crop.farm || this.selectedFarm?._id,
      currentStage: stage,
      stageStartedAt,
      plantingDate,
      expectedHarvestDate
    };

    this.cropService.updateCrop(crop._id, payload).subscribe({
      next: () => {
        this.pendingLifecycleStage = stage;
        this.lifecycleUpdateError = '';
        this.loadCrops();
        this.loadFields();
      },
      error: (error) => {
        this.lifecycleUpdateError =
          error?.error?.message || 'Unable to update crop stage.';
        console.error(error);
      }
    });

  }
  
  renderMaps() {

    setTimeout(() => {

      this.filteredFarms.forEach((farm) => {

        if (
          !farm.latitude ||
          !farm.longitude
        ) {
          return;
        }

        const mapElement = document.getElementById(
          'map-' + farm._id
        );

        if (!mapElement) {
          return;
        }

        const position = {
          lat: farm.latitude,
          lng: farm.longitude
        };

        const map = new google.maps.Map(
          mapElement,
          {
        center: position,
        zoom: 12,
        mapTypeId: this.getGoogleMapTypeId(),
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true
          }
        );

        new google.maps.Marker({
          position,
          map,
          title: farm.name
        });

      });

    }, 100);

  }

  filterFarms() {

  this.filteredFarms = this.farms.filter((farm) => {

    const matchesLocation =
      farm.location
        ?.toLowerCase()
        .includes(
          this.searchLocation.toLowerCase()
        );

    const matchesOwner =
      farm.owner?.email
        ?.toLowerCase()
        .includes(
          this.searchOwner.toLowerCase()
        );

    return matchesLocation && matchesOwner;

    

  });

  setTimeout(() => {
  this.renderMaps();
}, 100);

}

renderSelectedFarmMap() {

  setTimeout(() => {

    if (
      !this.mapsReady ||
      !this.selectedFarm
    ) {
      return;
    }

    const mapElement =
      document.getElementById('selected-farm-map');

    if (!mapElement) {
      return;
    }

    this.clearNdviOverlays();

    const hasCoordinates =
      this.selectedFarm.latitude &&
      this.selectedFarm.longitude;

    const position = {
      lat: hasCoordinates ? this.selectedFarm.latitude : 4.5709,
      lng: hasCoordinates ? this.selectedFarm.longitude : -74.2973
    };

    const map = new google.maps.Map(
      mapElement,
      {
        center: position,
        zoom: hasCoordinates ? 16 : 6,
        mapTypeId: this.getGoogleMapTypeId(),
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true
      }
    );
    this.addMapLayerControls(map);

    new google.maps.Marker({
      position,
      map,
      title: this.selectedFarm.name
    });

    this.renderFarmBoundaryOnMap(map, this.selectedFarm.polygonCoordinates || []);
    this.renderFieldBoundariesOnMap(map);

  }, 120);

}

searchByLocation(location: string) {

  this.searchLocation = location;

  this.filterFarms();

}

searchByOwner(ownerEmail: string) {

  this.searchOwner = ownerEmail;

  this.filterFarms();

}

openCreateFarm() {
  this.editingFarmId = '';
  this.farmName = '';
  this.farmLocation = '';
  this.farmSize = 0;
  this.farmLatitude = 0;
  this.farmLongitude = 0;
  this.farmBoundaryCoordinates = [];
  this.farmFormOpen = true;

  setTimeout(() => {
    this.initializeFarmFormMap();
  }, 150);
}

closeFarmForm() {
  this.farmFormOpen = false;
}

drawFarmBoundary() {

  this.initializeFarmFormMap();
  this.clearFarmBoundary();
  this.isDrawingFarmBoundary = true;
  this.cdr.detectChanges();

}

finishFarmBoundary() {

  if (this.farmBoundaryCoordinates.length < 3) {
    return;
  }

  this.isDrawingFarmBoundary = false;
  this.updateFarmBoundaryFromPolygon();
  this.cdr.detectChanges();

}

clearFarmBoundary() {

  this.clearFarmBoundaryOverlays();
  this.isDrawingFarmBoundary = false;

}

drawFieldBoundary() {

  this.initializeFieldBoundaryMap();
  this.clearFieldBoundary();
  this.isDrawingFieldBoundary = true;
  this.cdr.detectChanges();

}

finishFieldBoundary() {

  if (this.fieldBoundaryCoordinates.length < 3) {
    return;
  }

  this.isDrawingFieldBoundary = false;
  this.updateFieldBoundaryFromPolygon();
  this.renderFieldFormBoundary();
  this.cdr.detectChanges();

}

clearFieldBoundary() {

  this.clearFieldBoundaryOverlays();
  this.isDrawingFieldBoundary = false;

}

drawZoneBoundary() {

  this.initializeZoneBoundaryMap();
  this.clearZoneBoundary();
  this.isDrawingZoneBoundary = true;
  this.cdr.detectChanges();

}

finishZoneBoundary() {

  if (this.zoneBoundaryCoordinates.length < 3) {
    return;
  }

  this.isDrawingZoneBoundary = false;
  this.updateZoneBoundaryFromPolygon();
  this.renderZoneFormBoundary();
  this.cdr.detectChanges();

}

clearZoneBoundary() {

  this.clearZoneBoundaryOverlays();
  this.isDrawingZoneBoundary = false;

}

private initializeFarmFormMap() {

  if (!this.mapsReady) {
    return;
  }

  const mapElement =
    document.getElementById('farm-location-map');

  if (!mapElement) {
    return;
  }

  const hasCoordinates =
    this.farmLatitude &&
    this.farmLongitude;

  const position = {
    lat: hasCoordinates ? Number(this.farmLatitude) : 4.5709,
    lng: hasCoordinates ? Number(this.farmLongitude) : -74.2973
  };

  this.farmFormMap = new google.maps.Map(
    mapElement,
    {
      center: position,
      zoom: hasCoordinates ? 16 : 6,
      mapTypeId: this.getGoogleMapTypeId(),
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true
    }
  );
  this.addMapBoundaryControls(this.farmFormMap, 'farm');
  this.addMapLayerControls(this.farmFormMap);

  this.farmFormMarker = new google.maps.Marker({
    position,
    map: this.farmFormMap,
    draggable: true,
    title: this.farmName || 'Farm location'
  });

  this.farmFormMarker.addListener('dragend', (event: any) => {
    this.setFarmCoordinates(event.latLng.lat(), event.latLng.lng());
    this.reverseGeocodeFarmLocation(event.latLng.lat(), event.latLng.lng());
  });

  this.farmFormMap.addListener('click', (event: any) => {
    const position = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    if (this.isDrawingFarmBoundary) {
      this.addFarmBoundaryVertex(position);
      return;
    }

    this.updateFarmFormMarker({
      lat: position.lat,
      lng: position.lng
    }, false, true);
  });

  this.renderFarmFormBoundary();

}

private renderFarmFormBoundary() {

  this.clearFarmBoundaryOverlays(false);

  if (!this.farmBoundaryCoordinates.length) {
    this.farmFormPolygon = null;
    return;
  }

  this.farmFormPolygon = new google.maps.Polygon({
    paths: this.farmBoundaryCoordinates,
    fillColor: '#16a34a',
    fillOpacity: .22,
    strokeColor: '#15803d',
    strokeOpacity: .9,
    strokeWeight: 2,
    clickable: false,
    editable: true,
    map: this.farmFormMap
  });

  this.renderFarmBoundaryVertexMarkers();

  const bounds = new google.maps.LatLngBounds();

  this.farmBoundaryCoordinates.forEach(point => {
    bounds.extend(point);
  });

  this.farmFormMap.fitBounds(bounds);
  this.watchFarmPolygonEdits();

}

private renderFarmBoundaryOnMap(map: any, coordinates: any[]) {

  if (!coordinates.length) {
    return;
  }

  const polygon = new google.maps.Polygon({
    paths: coordinates,
    fillColor: '#16a34a',
    fillOpacity: .2,
    strokeColor: '#bbf7d0',
    strokeOpacity: .95,
    strokeWeight: 2,
    clickable: false,
    map
  });

  const bounds = new google.maps.LatLngBounds();

  coordinates.forEach(point => {
    bounds.extend(point);
  });

  map.fitBounds(bounds);

}

private renderFieldBoundariesOnMap(map: any) {

  this.selectedFarmFields
    .filter(field => field.polygonCoordinates?.length)
    .forEach(field => {
      const selected =
        this.selectedField?._id === field._id;

      const polygon = new google.maps.Polygon({
        paths: field.polygonCoordinates,
        fillColor: selected ? '#f59e0b' : '#22c55e',
        fillOpacity: selected ? .38 : .2,
        strokeColor: selected ? '#f97316' : '#16a34a',
        strokeOpacity: .95,
        strokeWeight: selected ? 3 : 2,
        clickable: true,
        map
      });

      polygon.addListener('click', () => this.selectField(field));
      this.renderFieldBoundaryLabel(map, field);
    });

  this.renderNdviLayerOnMap(map);
  this.renderZoneBoundariesOnMap(map);

}

private renderZoneBoundariesOnMap(map: any) {

  this.selectedFieldZones
    .filter(zone => zone.polygonCoordinates?.length)
    .forEach((zone, index) => {
      const selected =
        this.selectedZone?._id === zone._id;

      const polygon = new google.maps.Polygon({
        paths: zone.polygonCoordinates,
        fillColor: this.getZoneColor(index),
        fillOpacity: selected ? .46 : .3,
        strokeColor: selected ? '#111827' : this.getZoneColor(index),
        strokeOpacity: selected ? 1 : .9,
        strokeWeight: selected ? 3 : 2,
        clickable: true,
        zIndex: selected ? 70 : 60,
        map
      });

      polygon.addListener('click', () => this.selectZone(zone));
      this.renderZoneBoundaryLabel(map, zone);
    });

}

private getZoneColor(index: number) {

  const colors = [
    '#0ea5e9',
    '#a855f7',
    '#14b8a6',
    '#f97316',
    '#84cc16',
    '#ec4899'
  ];

  return colors[index % colors.length];

}

private renderNdviLayerOnMap(map: any) {

  if (
    this.selectedMapLayer !== 'ndvi' ||
    !map ||
    typeof google === 'undefined'
  ) {
    return;
  }

  this.selectedFarmFields
    .filter(field => field.polygonCoordinates?.length)
    .forEach(field => {
      const selected =
        this.selectedField?._id === field._id;

      const overlay = new google.maps.Polygon({
        paths: field.polygonCoordinates,
        fillColor: this.getFieldNdviColor(field),
        fillOpacity: selected ? .68 : .52,
        strokeColor: selected ? '#f97316' : this.getFieldNdviColor(field),
        strokeOpacity: selected ? 1 : .86,
        strokeWeight: selected ? 3 : 2,
        clickable: true,
        zIndex: selected ? 40 : 30,
        map
      });

      overlay.addListener('click', () => this.selectField(field));
      this.ndviOverlays.push(overlay);
    });

}

private clearNdviOverlays() {

  this.ndviOverlays.forEach(overlay => overlay.setMap(null));
  this.ndviOverlays = [];

}

private getFieldNdviColor(field: any) {

  const score =
    this.getFieldNdviScore(field);

  if (score <= 30) {
    return '#ef4444';
  }

  if (score <= 60) {
    return '#facc15';
  }

  if (score <= 80) {
    return '#84cc16';
  }

  return '#15803d';

}

private getPolygonCenter(coordinates: any[]) {

  if (!coordinates.length) {
    return null;
  }

  const center = coordinates.reduce(
    (sum: any, point: any) => ({
      lat: sum.lat + Number(point.lat),
      lng: sum.lng + Number(point.lng)
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: center.lat / coordinates.length,
    lng: center.lng / coordinates.length
  };

}

private validateFieldBoundaryBeforeSave() {

  this.fieldBoundaryError = '';

  if (this.fieldBoundaryCoordinates.length < 3) {
    return true;
  }

  const farmPolygon =
    this.selectedFarm?.polygonCoordinates || [];

  if (
    farmPolygon.length < 3 ||
    !this.isPolygonInsidePolygon(this.fieldBoundaryCoordinates, farmPolygon)
  ) {
    this.fieldBoundaryError =
      'Field boundary must stay inside the selected farm.';
    this.cdr.detectChanges();
    return false;
  }

  const overlapsExistingField =
    this.selectedFarmFields
      .filter(field =>
        field._id !== this.editingFieldId &&
        field.polygonCoordinates?.length
      )
      .some(field =>
        this.polygonsOverlap(
          this.fieldBoundaryCoordinates,
          field.polygonCoordinates
        )
      );

  if (overlapsExistingField) {
    this.fieldBoundaryError =
      'Field boundary overlaps an existing field.';
    this.cdr.detectChanges();
    return false;
  }

  return true;

}

private validateZoneBoundaryBeforeSave() {

  this.zoneBoundaryError = '';

  if (this.zoneBoundaryCoordinates.length < 3) {
    return true;
  }

  const fieldPolygon =
    this.selectedField?.polygonCoordinates || [];

  if (
    fieldPolygon.length < 3 ||
    !this.isPolygonInsidePolygon(this.zoneBoundaryCoordinates, fieldPolygon)
  ) {
    this.zoneBoundaryError =
      'Zone boundary must stay inside the selected field.';
    this.cdr.detectChanges();
    return false;
  }

  const overlapsExistingZone =
    this.selectedFieldZones
      .filter(zone =>
        zone._id !== this.editingZoneId &&
        zone.polygonCoordinates?.length
      )
      .some(zone =>
        this.polygonsOverlap(
          this.zoneBoundaryCoordinates,
          zone.polygonCoordinates
        )
      );

  if (overlapsExistingZone) {
    this.zoneBoundaryError =
      'Zone boundary overlaps an existing zone.';
    this.cdr.detectChanges();
    return false;
  }

  return true;

}

private normalizePolygon(coordinates: any[]) {

  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map(point => ({
      lat: Number(point?.lat),
      lng: Number(point?.lng)
    }))
    .filter(point =>
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng)
    );

}

private pointsEqual(first: any, second: any) {

  return (
    Math.abs(first.lat - second.lat) < 1e-10 &&
    Math.abs(first.lng - second.lng) < 1e-10
  );

}

private orientation(first: any, second: any, third: any) {

  const value =
    (second.lng - first.lng) * (third.lat - second.lat) -
    (second.lat - first.lat) * (third.lng - second.lng);

  if (Math.abs(value) < 1e-10) {
    return 0;
  }

  return value > 0 ? 1 : 2;

}

private pointOnSegment(first: any, point: any, second: any) {

  return (
    point.lat <= Math.max(first.lat, second.lat) + 1e-10 &&
    point.lat + 1e-10 >= Math.min(first.lat, second.lat) &&
    point.lng <= Math.max(first.lng, second.lng) + 1e-10 &&
    point.lng + 1e-10 >= Math.min(first.lng, second.lng) &&
    this.orientation(first, point, second) === 0
  );

}

private segmentsIntersect(firstStart: any, firstEnd: any, secondStart: any, secondEnd: any) {

  const firstOrientation =
    this.orientation(firstStart, firstEnd, secondStart);
  const secondOrientation =
    this.orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation =
    this.orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation =
    this.orientation(secondStart, secondEnd, firstEnd);

  if (
    firstOrientation !== secondOrientation &&
    thirdOrientation !== fourthOrientation
  ) {
    return true;
  }

  return (
    (firstOrientation === 0 && this.pointOnSegment(firstStart, secondStart, firstEnd)) ||
    (secondOrientation === 0 && this.pointOnSegment(firstStart, secondEnd, firstEnd)) ||
    (thirdOrientation === 0 && this.pointOnSegment(secondStart, firstStart, secondEnd)) ||
    (fourthOrientation === 0 && this.pointOnSegment(secondStart, firstEnd, secondEnd))
  );

}

private getPolygonEdges(polygon: any[]) {

  return polygon.map((point, index) => [
    point,
    polygon[(index + 1) % polygon.length]
  ]);

}

private isPointInPolygon(point: any, coordinates: any[]) {

  const polygon =
    this.normalizePolygon(coordinates);

  if (polygon.length < 3) {
    return false;
  }

  for (const [start, end] of this.getPolygonEdges(polygon)) {
    if (this.pointOnSegment(start, point, end)) {
      return true;
    }
  }

  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current =
      polygon[index];
    const previous =
      polygon[previousIndex];
    const intersects =
      current.lng > point.lng !== previous.lng > point.lng &&
      point.lat < (
        (previous.lat - current.lat) *
        (point.lng - current.lng) /
        (previous.lng - current.lng) +
        current.lat
      );

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;

}

private isPolygonInsidePolygon(childCoordinates: any[], parentCoordinates: any[]) {

  const child =
    this.normalizePolygon(childCoordinates);
  const parent =
    this.normalizePolygon(parentCoordinates);

  if (child.length < 3 || parent.length < 3) {
    return false;
  }

  const verticesInside =
    child.every(point => this.isPointInPolygon(point, parent));

  if (!verticesInside) {
    return false;
  }

  const parentEdges =
    this.getPolygonEdges(parent);

  return this.getPolygonEdges(child).every(([childStart, childEnd]) =>
    parentEdges.every(([parentStart, parentEnd]) => {
      if (
        this.pointsEqual(childStart, parentStart) ||
        this.pointsEqual(childStart, parentEnd) ||
        this.pointsEqual(childEnd, parentStart) ||
        this.pointsEqual(childEnd, parentEnd)
      ) {
        return true;
      }

      return !this.segmentsIntersect(childStart, childEnd, parentStart, parentEnd);
    })
  );

}

private polygonsOverlap(firstCoordinates: any[], secondCoordinates: any[]) {

  const first =
    this.normalizePolygon(firstCoordinates);
  const second =
    this.normalizePolygon(secondCoordinates);

  if (first.length < 3 || second.length < 3) {
    return false;
  }

  const edgesIntersect =
    this.getPolygonEdges(first).some(([firstStart, firstEnd]) =>
      this.getPolygonEdges(second).some(([secondStart, secondEnd]) =>
        this.segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)
      )
    );

  if (edgesIntersect) {
    return true;
  }

  return (
    first.some(point => this.isPointInPolygon(point, second)) ||
    second.some(point => this.isPointInPolygon(point, first))
  );

}

private watchFarmPolygonEdits() {

  if (!this.farmFormPolygon) {
    return;
  }

  const path = this.farmFormPolygon.getPath();
  path.addListener('set_at', () => this.updateFarmBoundaryFromPolygon());
  path.addListener('insert_at', () => this.updateFarmBoundaryFromPolygon());
  path.addListener('remove_at', () => this.updateFarmBoundaryFromPolygon());

}

private addFarmBoundaryVertex(position: any) {

  this.farmBoundaryCoordinates = [
    ...this.farmBoundaryCoordinates,
    {
      lat: position.lat,
      lng: position.lng
    }
  ];

  this.renderFarmFormBoundary();

  if (this.farmBoundaryCoordinates.length >= 3) {
    this.updateFarmBoundaryFromPolygon();
  }

  this.cdr.detectChanges();

}

private clearFarmBoundaryOverlays(resetData = true) {

  if (this.farmFormPolygon) {
    this.farmFormPolygon.setMap(null);
  }

  this.farmBoundaryVertexMarkers.forEach(marker => marker.setMap(null));
  this.farmBoundaryVertexMarkers = [];
  this.farmFormPolygon = null;

  if (resetData) {
    this.farmBoundaryCoordinates = [];
    this.farmSize = 0;
  }

}

private renderFarmBoundaryVertexMarkers() {

  if (!this.farmFormMap) {
    return;
  }

  this.farmBoundaryCoordinates.forEach((point, index) => {
    const marker = new google.maps.Marker({
      position: point,
      map: this.farmFormMap,
      label: `${index + 1}`,
      title: `Boundary point ${index + 1}`,
      draggable: true
    });

    marker.addListener('dragend', (event: any) => {
      this.farmBoundaryCoordinates[index] = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      this.renderFarmFormBoundary();

      if (this.farmBoundaryCoordinates.length >= 3) {
        this.updateFarmBoundaryFromPolygon();
      }
    });

    this.farmBoundaryVertexMarkers.push(marker);
  });

}

private updateFarmBoundaryFromPolygon() {

  if (!this.farmFormPolygon) {
    return;
  }

  const path = this.farmFormPolygon.getPath();

  this.farmBoundaryCoordinates =
    path.getArray().map((point: any) => ({
      lat: point.lat(),
      lng: point.lng()
    }));

  const areaSquareMeters =
    google.maps.geometry.spherical.computeArea(path);

  this.farmSize =
    Number((areaSquareMeters / 10000).toFixed(2));

  this.cdr.detectChanges();

}

private updateFarmFormMarker(position: any, recenter: boolean, reverseGeocode = false) {

  this.setFarmCoordinates(position.lat, position.lng);
  if (reverseGeocode) {
    this.reverseGeocodeFarmLocation(position.lat, position.lng);
  }

  if (!this.farmFormMap) {
    this.initializeFarmFormMap();
  }

  if (!this.farmFormMap) {
    return;
  }

  if (!this.farmFormMarker) {
    this.farmFormMarker = new google.maps.Marker({
      position,
      map: this.farmFormMap,
      draggable: true
    });
  } else {
    this.farmFormMarker.setPosition(position);
  }

  if (recenter) {
    this.farmFormMap.setCenter(position);
    this.farmFormMap.setZoom(16);
  }

}

private setFarmCoordinates(lat: number, lng: number) {

  this.farmLatitude = Number(lat.toFixed(6));
  this.farmLongitude = Number(lng.toFixed(6));
  this.cdr.detectChanges();

}

private initializeFieldBoundaryMap() {

  if (!this.mapsReady || !this.selectedFarm) {
    return;
  }

  const mapElement =
    document.getElementById('field-boundary-map');

  if (!mapElement) {
    return;
  }

  const hasCoordinates =
    this.selectedFarm.latitude &&
    this.selectedFarm.longitude;

  const position = {
    lat: hasCoordinates ? Number(this.selectedFarm.latitude) : 4.5709,
    lng: hasCoordinates ? Number(this.selectedFarm.longitude) : -74.2973
  };

  this.fieldBoundaryMap = new google.maps.Map(
    mapElement,
    {
      center: position,
      zoom: hasCoordinates ? 16 : 6,
      mapTypeId: this.getGoogleMapTypeId(),
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true
    }
  );
  this.addMapBoundaryControls(this.fieldBoundaryMap, 'field');
  this.addMapLayerControls(this.fieldBoundaryMap);

  this.renderFarmBoundaryOnMap(
    this.fieldBoundaryMap,
    this.selectedFarm.polygonCoordinates || []
  );
  this.renderExistingFieldsForForm();

  this.fieldBoundaryMap.addListener('click', (event: any) => {
    if (!this.isDrawingFieldBoundary) {
      return;
    }

    this.addFieldBoundaryVertex({
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    });
  });

  this.renderFieldFormBoundary();

}

private renderExistingFieldsForForm() {

  if (!this.fieldBoundaryMap) {
    return;
  }

  this.selectedFarmFields
    .filter(field =>
      field._id !== this.editingFieldId &&
      field.polygonCoordinates?.length
    )
    .forEach(field => {
      new google.maps.Polygon({
        paths: field.polygonCoordinates,
        fillColor: '#f63b3b',
        fillOpacity: .16,
        strokeColor: '#eb2525',
        strokeOpacity: .9,
        strokeWeight: 2,
        clickable: false,
        map: this.fieldBoundaryMap
      });
    });

}

private renderFieldFormBoundary() {

  this.clearFieldBoundaryOverlays(false);

  if (!this.fieldBoundaryCoordinates.length) {
    this.fieldBoundaryPolygon = null;
    return;
  }

  this.fieldBoundaryPolygon = new google.maps.Polygon({
    paths: this.fieldBoundaryCoordinates,
    fillColor: '#f59e0b',
    fillOpacity: .34,
    strokeColor: '#f97316',
    strokeOpacity: .95,
    strokeWeight: 2,
    clickable: false,
    editable: true,
    map: this.fieldBoundaryMap
  });

  this.renderFieldBoundaryVertexMarkers();

  const bounds = new google.maps.LatLngBounds();

  this.fieldBoundaryCoordinates.forEach(point => {
    bounds.extend(point);
  });

  this.fieldBoundaryMap.fitBounds(bounds);
  this.watchFieldPolygonEdits();

}

private renderFieldBoundaryLabel(map: any, field: any) {

  const coordinates = field.polygonCoordinates || [];

  if (!coordinates.length) {
    return;
  }

  const center = coordinates.reduce(
    (sum: any, point: any) => ({
      lat: sum.lat + Number(point.lat),
      lng: sum.lng + Number(point.lng)
    }),
    { lat: 0, lng: 0 }
  );

  const position = {
    lat: center.lat / coordinates.length,
    lng: center.lng / coordinates.length
  };

  const marker = new google.maps.Marker({
    position,
    map,
    label: {
      text: field.name,
      color: '#fff',
      fontSize: '12px',
      fontWeight: '700'
    },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 0
    }
  });

  marker.addListener('click', () => this.selectField(field));

}

private renderZoneBoundaryLabel(map: any, zone: any) {

  const coordinates = zone.polygonCoordinates || [];

  if (!coordinates.length) {
    return;
  }

  const center = coordinates.reduce(
    (sum: any, point: any) => ({
      lat: sum.lat + Number(point.lat),
      lng: sum.lng + Number(point.lng)
    }),
    { lat: 0, lng: 0 }
  );

  const marker = new google.maps.Marker({
    position: {
      lat: center.lat / coordinates.length,
      lng: center.lng / coordinates.length
    },
    map,
    label: {
      text: zone.name,
      color: '#111827',
      fontSize: '12px',
      fontWeight: '800'
    },
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 0
    }
  });

  marker.addListener('click', () => this.selectZone(zone));

}

private watchFieldPolygonEdits() {

  if (!this.fieldBoundaryPolygon) {
    return;
  }

  const path = this.fieldBoundaryPolygon.getPath();
  path.addListener('set_at', () => this.updateFieldBoundaryFromPolygon());
  path.addListener('insert_at', () => this.updateFieldBoundaryFromPolygon());
  path.addListener('remove_at', () => this.updateFieldBoundaryFromPolygon());

}

private initializeZoneBoundaryMap() {

  if (!this.mapsReady || !this.selectedFarm || !this.selectedField) {
    return;
  }

  const mapElement =
    document.getElementById('zone-boundary-map');

  if (!mapElement) {
    return;
  }

  const coordinates =
    this.selectedField.polygonCoordinates || [];
  const center =
    this.getPolygonCenter(coordinates);
  const hasCenter =
    Boolean(center);
  const fallbackPosition = {
    lat: this.selectedFarm.latitude ? Number(this.selectedFarm.latitude) : 4.5709,
    lng: this.selectedFarm.longitude ? Number(this.selectedFarm.longitude) : -74.2973
  };

  this.zoneBoundaryMap = new google.maps.Map(
    mapElement,
    {
      center: hasCenter ? center : fallbackPosition,
      zoom: hasCenter ? 17 : 6,
      mapTypeId: this.getGoogleMapTypeId(),
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true
    }
  );
  this.addMapBoundaryControls(this.zoneBoundaryMap, 'zone');
  this.addMapLayerControls(this.zoneBoundaryMap);

  this.renderFarmBoundaryOnMap(
    this.zoneBoundaryMap,
    this.selectedFarm.polygonCoordinates || []
  );

  this.renderZoneFieldContext();
  this.renderExistingZonesForForm();

  this.zoneBoundaryMap.addListener('click', (event: any) => {
    if (!this.isDrawingZoneBoundary) {
      return;
    }

    this.addZoneBoundaryVertex({
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    });
  });

  this.renderZoneFormBoundary();

}

private renderZoneFieldContext() {

  if (
    !this.zoneBoundaryMap ||
    !this.selectedField?.polygonCoordinates?.length
  ) {
    return;
  }

  new google.maps.Polygon({
    paths: this.selectedField.polygonCoordinates,
    fillColor: '#f59e0b',
    fillOpacity: .16,
    strokeColor: '#f97316',
    strokeOpacity: .95,
    strokeWeight: 2,
    clickable: false,
    map: this.zoneBoundaryMap
  });

}

private renderExistingZonesForForm() {

  if (!this.zoneBoundaryMap) {
    return;
  }

  this.selectedFieldZones
    .filter(zone =>
      zone._id !== this.editingZoneId &&
      zone.polygonCoordinates?.length
    )
    .forEach((zone, index) => {
      new google.maps.Polygon({
        paths: zone.polygonCoordinates,
        fillColor: this.getZoneColor(index),
        fillOpacity: .22,
        strokeColor: this.getZoneColor(index),
        strokeOpacity: .75,
        strokeWeight: 2,
        clickable: false,
        map: this.zoneBoundaryMap
      });
    });

}

private renderZoneFormBoundary() {

  this.clearZoneBoundaryOverlays(false);

  if (!this.zoneBoundaryCoordinates.length) {
    this.zoneBoundaryPolygon = null;
    return;
  }

  this.zoneBoundaryPolygon = new google.maps.Polygon({
    paths: this.zoneBoundaryCoordinates,
    fillColor: '#0ea5e9',
    fillOpacity: .34,
    strokeColor: '#0284c7',
    strokeOpacity: .95,
    strokeWeight: 2,
    clickable: false,
    editable: true,
    map: this.zoneBoundaryMap
  });

  this.renderZoneBoundaryVertexMarkers();

  const bounds = new google.maps.LatLngBounds();

  this.zoneBoundaryCoordinates.forEach(point => {
    bounds.extend(point);
  });

  this.zoneBoundaryMap.fitBounds(bounds);
  this.watchZonePolygonEdits();

}

private watchZonePolygonEdits() {

  if (!this.zoneBoundaryPolygon) {
    return;
  }

  const path = this.zoneBoundaryPolygon.getPath();
  path.addListener('set_at', () => this.updateZoneBoundaryFromPolygon());
  path.addListener('insert_at', () => this.updateZoneBoundaryFromPolygon());
  path.addListener('remove_at', () => this.updateZoneBoundaryFromPolygon());

}

private addZoneBoundaryVertex(position: any) {

  this.zoneBoundaryCoordinates = [
    ...this.zoneBoundaryCoordinates,
    {
      lat: position.lat,
      lng: position.lng
    }
  ];

  this.renderZoneFormBoundary();

  if (this.zoneBoundaryCoordinates.length >= 3) {
    this.updateZoneBoundaryFromPolygon();
  }

  this.cdr.detectChanges();

}

private clearZoneBoundaryOverlays(resetData = true) {

  if (this.zoneBoundaryPolygon) {
    this.zoneBoundaryPolygon.setMap(null);
  }

  this.zoneBoundaryVertexMarkers.forEach(marker => marker.setMap(null));
  this.zoneBoundaryVertexMarkers = [];
  this.zoneBoundaryPolygon = null;

  if (resetData) {
    this.zoneBoundaryCoordinates = [];
    this.zoneArea = 0;
  }

}

private renderZoneBoundaryVertexMarkers() {

  if (!this.zoneBoundaryMap) {
    return;
  }

  this.zoneBoundaryCoordinates.forEach((point, index) => {
    const marker = new google.maps.Marker({
      position: point,
      map: this.zoneBoundaryMap,
      label: `${index + 1}`,
      title: `Zone boundary point ${index + 1}`,
      draggable: true
    });

    marker.addListener('dragend', (event: any) => {
      this.zoneBoundaryCoordinates[index] = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      this.renderZoneFormBoundary();

      if (this.zoneBoundaryCoordinates.length >= 3) {
        this.updateZoneBoundaryFromPolygon();
      }
    });

    this.zoneBoundaryVertexMarkers.push(marker);
  });

}

private updateZoneBoundaryFromPolygon() {

  if (!this.zoneBoundaryPolygon) {
    return;
  }

  const path = this.zoneBoundaryPolygon.getPath();

  this.zoneBoundaryCoordinates =
    path.getArray().map((point: any) => ({
      lat: point.lat(),
      lng: point.lng()
    }));

  const areaSquareMeters =
    google.maps.geometry.spherical.computeArea(path);

  this.zoneArea =
    Number((areaSquareMeters / 10000).toFixed(2));

  this.cdr.detectChanges();

}

private addFieldBoundaryVertex(position: any) {

  this.fieldBoundaryCoordinates = [
    ...this.fieldBoundaryCoordinates,
    {
      lat: position.lat,
      lng: position.lng
    }
  ];

  this.renderFieldFormBoundary();

  if (this.fieldBoundaryCoordinates.length >= 3) {
    this.updateFieldBoundaryFromPolygon();
  }

  this.cdr.detectChanges();

}

private clearFieldBoundaryOverlays(resetData = true) {

  if (this.fieldBoundaryPolygon) {
    this.fieldBoundaryPolygon.setMap(null);
  }

  this.fieldBoundaryVertexMarkers.forEach(marker => marker.setMap(null));
  this.fieldBoundaryVertexMarkers = [];
  this.fieldBoundaryPolygon = null;

  if (resetData) {
    this.fieldBoundaryCoordinates = [];
    this.fieldArea = 0;
  }

}

private renderFieldBoundaryVertexMarkers() {

  if (!this.fieldBoundaryMap) {
    return;
  }

  this.fieldBoundaryCoordinates.forEach((point, index) => {
    const marker = new google.maps.Marker({
      position: point,
      map: this.fieldBoundaryMap,
      label: `${index + 1}`,
      title: `Field boundary point ${index + 1}`,
      draggable: true
    });

    marker.addListener('dragend', (event: any) => {
      this.fieldBoundaryCoordinates[index] = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      this.renderFieldFormBoundary();

      if (this.fieldBoundaryCoordinates.length >= 3) {
        this.updateFieldBoundaryFromPolygon();
      }
    });

    this.fieldBoundaryVertexMarkers.push(marker);
  });

}

private updateFieldBoundaryFromPolygon() {

  if (!this.fieldBoundaryPolygon) {
    return;
  }

  const path = this.fieldBoundaryPolygon.getPath();

  this.fieldBoundaryCoordinates =
    path.getArray().map((point: any) => ({
      lat: point.lat(),
      lng: point.lng()
    }));

  const areaSquareMeters =
    google.maps.geometry.spherical.computeArea(path);

  this.fieldArea =
    Number((areaSquareMeters / 10000).toFixed(2));

  this.cdr.detectChanges();

}

private addMapBoundaryControls(map: any, mode: 'farm' | 'field' | 'zone') {

  if (!map || !google?.maps?.ControlPosition) {
    return;
  }

  const control = document.createElement('div');
  control.style.display = 'flex';
  control.style.flexWrap = 'wrap';
  control.style.gap = '8px';
  control.style.margin = '0 0 18px 0';
  control.style.padding = '8px';
  control.style.background = 'rgba(255,255,255,.94)';
  control.style.border = '1px solid rgba(15,23,42,.12)';
  control.style.borderRadius = '14px';
  control.style.boxShadow = '0 14px 40px rgba(15,23,42,.18)';

  const drawLabel =
    mode === 'farm'
      ? 'Draw Boundary'
      : mode === 'field'
        ? 'Draw Field'
        : 'Draw Zone';

  const drawButton =
    this.createMapControlButton(drawLabel, true);
  const finishButton =
    this.createMapControlButton('Finish', true);
  const clearButton =
    this.createMapControlButton('Clear', false);

  drawButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (mode === 'farm') {
      this.clearFarmBoundary();
      this.isDrawingFarmBoundary = true;
    } else if (mode === 'field') {
      this.clearFieldBoundary();
      this.isDrawingFieldBoundary = true;
    } else {
      this.clearZoneBoundary();
      this.isDrawingZoneBoundary = true;
    }

    this.cdr.detectChanges();
  });

  finishButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (mode === 'farm') {
      this.finishFarmBoundary();
    } else if (mode === 'field') {
      this.finishFieldBoundary();
    } else {
      this.finishZoneBoundary();
    }
  });

  clearButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (mode === 'farm') {
      this.clearFarmBoundary();
    } else if (mode === 'field') {
      this.clearFieldBoundary();
    } else {
      this.clearZoneBoundary();
    }

    this.cdr.detectChanges();
  });

  control.append(drawButton, finishButton, clearButton);
  map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(control);

}

private addMapLayerControls(map: any) {

  if (!map || !google?.maps?.ControlPosition) {
    return;
  }

  const control = document.createElement('div');
  const buttons: HTMLButtonElement[] = [];
  control.style.display = 'flex';
  control.style.flexWrap = 'wrap';
  control.style.gap = '6px';
  control.style.margin = '12px';
  control.style.padding = '7px';
  control.style.background = 'rgba(255,255,255,.94)';
  control.style.border = '1px solid rgba(15,23,42,.12)';
  control.style.borderRadius = '14px';
  control.style.boxShadow = '0 12px 32px rgba(15,23,42,.16)';

  this.mapLayerOptions.forEach(option => {
    const button =
      this.createMapControlButton(option.label, option.value === this.selectedMapLayer);
    button.dataset['layer'] = option.value;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.setSelectedMapLayer(option.value, map, buttons);
    });

    buttons.push(button);
    control.appendChild(button);
  });

  this.activeMaps = this.activeMaps
    .filter(activeMap => activeMap?.getDiv?.()?.isConnected);
  this.activeMaps.push(map);
  this.mapLayerButtonGroups.push(buttons);
  this.updateMapLayerButtons(buttons);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(control);

}

private setSelectedMapLayer(layer: string, map?: any, buttons: HTMLButtonElement[] = []) {

  if (!this.isValidMapLayer(layer)) {
    return;
  }

  this.selectedMapLayer = layer;
  localStorage.setItem('farmops-map-layer', layer);

  this.activeMaps = this.activeMaps
    .filter(activeMap => activeMap?.getDiv?.()?.isConnected);
  this.activeMaps.forEach(activeMap =>
    activeMap.setMapTypeId(this.getGoogleMapTypeId(layer))
  );

  if (map && !this.activeMaps.includes(map)) {
    map.setMapTypeId(this.getGoogleMapTypeId(layer));
  }

  this.clearNdviOverlays();
  if (this.selectedMapLayer === 'ndvi') {
    this.activeMaps.forEach(activeMap => this.renderNdviLayerOnMap(activeMap));

    if (map && !this.activeMaps.includes(map)) {
      this.renderNdviLayerOnMap(map);
    }
  }

  this.mapLayerButtonGroups.forEach(group => this.updateMapLayerButtons(group));
  this.cdr.detectChanges();

}

private updateMapLayerButtons(buttons: HTMLButtonElement[]) {

  buttons.forEach(button => {
    const active =
      button.dataset['layer'] === this.selectedMapLayer;
    button.style.color = active ? '#ffffff' : '#274236';
    button.style.background = active ? '#16a34a' : '#ffffff';
    button.style.border = active ? '0' : '1px solid rgba(15,23,42,.14)';
  });

}

private getInitialMapLayer() {

  const storedLayer =
    localStorage.getItem('farmops-map-layer');

  return this.isValidMapLayer(storedLayer) ? storedLayer as string : 'hybrid';

}

private getGoogleMapTypeId(layer = this.selectedMapLayer) {

  return layer === 'ndvi' ? 'hybrid' : layer;

}

private isValidMapLayer(layer: any) {

  return ['roadmap', 'satellite', 'hybrid', 'terrain', 'ndvi'].includes(layer);

}

private createMapControlButton(label: string, primary: boolean) {

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.border = primary ? '0' : '1px solid rgba(15,23,42,.14)';
  button.style.borderRadius = '10px';
  button.style.padding = '10px 14px';
  button.style.fontWeight = '800';
  button.style.fontSize = '12px';
  button.style.cursor = 'pointer';
  button.style.color = primary ? '#ffffff' : '#274236';
  button.style.background = primary ? '#16a34a' : '#ffffff';

  return button;

}

private reverseGeocodeFarmLocation(lat: number, lng: number) {

  if (!this.mapsReady || !google?.maps?.Geocoder) {
    return;
  }

  if (!this.farmGeocoder) {
    this.farmGeocoder = new google.maps.Geocoder();
  }

  this.farmGeocoder.geocode(
    {
      location: { lat, lng }
    },
    (results: any[], status: string) => {
      if (
        status === 'OK' &&
        results?.length &&
        results[0]?.formatted_address
      ) {
        this.farmLocation = results[0].formatted_address;
        this.cdr.detectChanges();
      }
    }
  );

}

private syncSelectedField() {

  const fields = this.selectedFarmFields;

  if (this.selectedField) {
    this.selectedField =
      fields.find(field => field._id === this.selectedField._id) ||
      fields[0] ||
      null;
  } else {
    this.selectedField = fields[0] || null;
  }

  this.pendingLifecycleStage = this.getSelectedCropStage();
  this.lifecycleUpdateError = '';
  this.syncSelectedZone();

}

private applyPendingSelection() {

  if (this.pendingFarmId && this.farms.length) {
    const farm =
      this.farms.find(item => item._id === this.pendingFarmId);

    if (farm) {
      if (this.selectedFarm?._id !== farm._id) {
        this.selectFarm(farm);
      }
    } else {
      this.pendingFarmId = '';
      this.pendingFieldId = '';
      return;
    }
  }

  if (
    this.pendingFieldId &&
    this.selectedFarm &&
    this.fields.length
  ) {
    const field =
      this.selectedFarmFields.find(item => item._id === this.pendingFieldId);

    if (field) {
      this.selectField(field);
      this.pendingFieldId = '';
      this.pendingFarmId = '';
      return;
    }

    this.pendingFieldId = '';
  }

  if (
    this.pendingFarmId &&
    !this.pendingFieldId &&
    this.selectedFarm?._id === this.pendingFarmId
  ) {
    this.pendingFarmId = '';
  }

}

private syncSelectedZone() {

  const zones = this.selectedFieldZones;

  if (this.selectedZone) {
    this.selectedZone =
      zones.find(zone => zone._id === this.selectedZone._id) ||
      null;
  }

}

private getFieldData() {

  const hasCropAssignment =
    this.hasFieldCropAssignment();
  const plantingDate =
    hasCropAssignment &&
    this.fieldCurrentStage === 'Planning' &&
    !this.fieldPlantingDate
      ? this.toDateInputValue(new Date())
      : this.fieldPlantingDate;

  return {
    name: this.fieldName,
    cropType: '',
    crop: this.selectedCrop || null,
    plantingDate: hasCropAssignment && plantingDate
      ? plantingDate
      : null,
    currentStage: hasCropAssignment
      ? this.fieldCurrentStage
      : undefined,
    area: this.fieldArea,
    status: this.fieldStatus,
    healthStatus: this.fieldHealthStatus,
    irrigationStatus: this.fieldIrrigationStatus,
    farm: this.selectedFarm?._id,
    notes: this.fieldNotes,
    polygonCoordinates: this.fieldBoundaryCoordinates
  };

}

private getZoneData() {

  return {
    name: this.zoneName,
    field: this.selectedField?._id,
    polygonCoordinates: this.zoneBoundaryCoordinates,
    area: this.zoneArea,
    zoneType: this.zoneType,
    healthScore: this.zoneHealthScore,
    moistureScore: this.zoneMoistureScore,
    ndviScore: this.zoneNdviScore,
    recommendation: this.zoneRecommendation,
    notes: this.zoneNotes
  };

}

private resetFieldForm() {

  this.editingFieldId = '';
  this.fieldName = '';
  this.selectedCrop = '';
  this.cropSelectorSearch = '';
  this.fieldPlantingDate = '';
  this.fieldCurrentStage = 'Planning';
  this.fieldLifecycleError = '';
  this.fieldArea = 0;
  this.fieldStatus = 'Active';
  this.fieldHealthStatus = 'Good';
  this.fieldIrrigationStatus = 'Scheduled';
  this.fieldNotes = '';
  this.fieldBoundaryCoordinates = [];
  this.isDrawingFieldBoundary = false;

}

private resetZoneForm() {

  this.editingZoneId = '';
  this.zoneName = '';
  this.zoneType = 'Monitoring';
  this.zoneArea = 0;
  this.zoneHealthScore = this.selectedFieldHealthIndex ?? 0;
  this.zoneMoistureScore = this.selectedFieldSoilMoisture;
  this.zoneNdviScore = this.selectedFieldNdviScore;
  this.zoneRecommendation = this.getFieldRecommendations()[0]?.action || '';
  this.zoneNotes = '';
  this.zoneBoundaryCoordinates = [];
  this.isDrawingZoneBoundary = false;
  this.clearZoneBoundaryOverlays();

}

}
