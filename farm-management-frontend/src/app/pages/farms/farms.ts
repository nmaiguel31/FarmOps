import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';

declare const google: any;
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Farm } from '../../services/farm';
import { Field } from '../../services/field';
import { GoogleMapsLoader } from '../../services/google-maps-loader';

@Component({
  selector: 'app-farms',
  imports: [CommonModule, FormsModule],
  templateUrl: './farms.html',
  styleUrl: './farms.css',
})
export class Farms implements OnInit, AfterViewInit {

  @ViewChild('locationInput')
  locationInput!: ElementRef;
  @ViewChild('farmLocationMap')
  farmLocationMap!: ElementRef;
  farms: any[] = [];
  filteredFarms: any[] = [];
  fields: any[] = [];
  crops: any[] = [];
  selectedFarm: any = null;
  selectedField: any = null;
  expandedFarmIds = new Set<string>();

  searchLocation = '';
  searchOwner = '';
  fieldSearch = '';
  fieldFilter = 'All';
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
  fieldCropType = '';
  selectedCrop = '';
  fieldArea = 0;
  fieldStatus = 'Active';
  fieldHealthStatus = 'Good';
  fieldIrrigationStatus = 'Scheduled';
  fieldNotes = '';
  fieldBoundaryCoordinates: any[] = [];
  mapsReady = false;
  isDrawingFarmBoundary = false;
  isDrawingFieldBoundary = false;
  private farmFormMap: any = null;
  private farmFormMarker: any = null;
  private farmFormPolygon: any = null;
  private farmBoundaryVertexMarkers: any[] = [];
  private fieldBoundaryMap: any = null;
  private fieldBoundaryPolygon: any = null;
  private fieldBoundaryVertexMarkers: any[] = [];
  private farmGeocoder: any = null;

  private mapsLoader = inject(GoogleMapsLoader);
  private farmService = inject(Farm);
  private fieldService = inject(Field);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    this.loadFarms();
    this.loadFields();
    this.loadCrops();
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
        if (!this.selectedFarm && this.farms.length > 0) {
          this.selectFarm(this.farms[0]);
        } else if (this.selectedFarm) {
          this.selectedFarm =
            this.farms.find(farm => farm._id === this.selectedFarm._id) ||
            this.farms[0] ||
            null;
        }

        this.renderSelectedFarmMap();
        this.cdr.detectChanges();

      },

      error: (error) => console.error(error)

    });

  }

  loadFields() {

    this.fieldService.getFields().subscribe({

      next: (data: any) => {

        this.fields = [...data];
        this.syncSelectedField();
        this.renderSelectedFarmMap();
        this.cdr.detectChanges();

      },

      error: (error) => console.error(error)

    });

  }

  loadCrops() {

    this.fieldService.getCrops().subscribe({

      next: (data: any) => {

        this.crops = [...data];
        this.cdr.detectChanges();

      },

      error: (error) => console.error(error)

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

  get totalSelectedFieldArea() {
    return this.selectedFarmFields
      .reduce((sum, field) => sum + Number(field.area || 0), 0);
  }

  formatArea(value: any) {

    const area = Number(value || 0);
    return Number.isFinite(area) ? area.toFixed(2) : '0.00';

  }

  get selectedFieldCropLabel() {
    return this.selectedField
      ? this.getFieldCropLabel(this.selectedField)
      : 'Unassigned';
  }

  get selectedFieldHealthIndex() {
    if (!this.selectedField) {
      return 0;
    }

    if (this.selectedField.healthStatus === 'Critical') {
      return 48;
    }

    if (this.selectedField.healthStatus === 'Watch') {
      return 72;
    }

    return 91;
  }

  get selectedFieldSoilMoisture() {
    if (!this.selectedField) {
      return 0;
    }

    if (this.selectedField.irrigationStatus === 'Dry') {
      return 38;
    }

    if (this.selectedField.irrigationStatus === 'Irrigated') {
      return 84;
    }

    return 68;
  }

  getFieldCountForFarm(farm: any) {

    return this.fields.filter(field =>
      (field.farm?._id || field.farm) === farm._id
    ).length;

  }

  getCropsForSelectedFarm() {

    if (!this.selectedFarm) {
      return [];
    }

    return this.crops.filter(crop =>
      (crop.farm?._id || crop.farm) === this.selectedFarm._id
    );

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

      error: (error) => console.error(error)

    });

  }

  selectFarm(farm: any) {

    this.selectedFarm = farm;
    this.expandedFarmIds.add(farm._id);
    this.syncSelectedField();
    this.renderSelectedFarmMap();

  }

  selectField(field: any) {

    this.selectedField = field;
    if (field.farm?._id || field.farm) {
      this.expandedFarmIds.add(field.farm?._id || field.farm);
    }
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

      error: (error) => console.error(error)

    });

  }

  editField(field: any) {

    this.editingFieldId = field._id;
    this.fieldName = field.name;
    this.fieldCropType = field.cropType || '';
    this.selectedCrop = field.crop?._id || field.crop || '';
    this.fieldArea = field.area || 0;
    this.fieldStatus = field.status || 'Active';
    this.fieldHealthStatus = field.healthStatus || 'Good';
    this.fieldIrrigationStatus = field.irrigationStatus || 'Scheduled';
    this.fieldNotes = field.notes || '';
    this.fieldBoundaryCoordinates = field.polygonCoordinates || [];
    this.fieldFormOpen = true;

    setTimeout(() => {
      this.initializeFieldBoundaryMap();
    }, 150);

  }

  updateField() {

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

  closeFieldForm() {

    this.fieldFormOpen = false;
    this.isDrawingFieldBoundary = false;

  }

  openAddMapArea() {

    alert('Map area drawing will be added in a later phase.');

  }

  getFieldCropLabel(field: any) {

    return field.crop?.name || field.cropType || 'Unassigned';

  }

  getBadgeClass(value: string) {

    return (value || 'unknown')
      .toLowerCase()
      .replace(/\s+/g, '-');

  }

  getLifecycleState(index: number) {

    if (!this.selectedField) {
      return 'pending';
    }

    if (this.selectedField.status === 'Harvested') {
      return 'complete';
    }

    if (this.selectedField.status === 'Planned') {
      return index === 0 ? 'current' : 'pending';
    }

    if (this.selectedField.status === 'Resting') {
      return index < 2 ? 'complete' : index === 2 ? 'current' : 'pending';
    }

    return index < 3 ? 'complete' : index === 3 ? 'current' : 'pending';

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
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true
      }
    );

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
      mapTypeId: 'hybrid',
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true
    }
  );
  this.addMapBoundaryControls(this.farmFormMap, 'farm');

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
      mapTypeId: 'hybrid',
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true
    }
  );
  this.addMapBoundaryControls(this.fieldBoundaryMap, 'field');

  this.renderFarmBoundaryOnMap(
    this.fieldBoundaryMap,
    this.selectedFarm.polygonCoordinates || []
  );

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

private watchFieldPolygonEdits() {

  if (!this.fieldBoundaryPolygon) {
    return;
  }

  const path = this.fieldBoundaryPolygon.getPath();
  path.addListener('set_at', () => this.updateFieldBoundaryFromPolygon());
  path.addListener('insert_at', () => this.updateFieldBoundaryFromPolygon());
  path.addListener('remove_at', () => this.updateFieldBoundaryFromPolygon());

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

private addMapBoundaryControls(map: any, mode: 'farm' | 'field') {

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
    mode === 'farm' ? 'Draw Boundary' : 'Draw Field';

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
    } else {
      this.clearFieldBoundary();
      this.isDrawingFieldBoundary = true;
    }

    this.cdr.detectChanges();
  });

  finishButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (mode === 'farm') {
      this.finishFarmBoundary();
    } else {
      this.finishFieldBoundary();
    }
  });

  clearButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (mode === 'farm') {
      this.clearFarmBoundary();
    } else {
      this.clearFieldBoundary();
    }

    this.cdr.detectChanges();
  });

  control.append(drawButton, finishButton, clearButton);
  map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(control);

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

}

private getFieldData() {

  return {
    name: this.fieldName,
    cropType: this.selectedCrop ? '' : this.fieldCropType,
    crop: this.selectedCrop || null,
    area: this.fieldArea,
    status: this.fieldStatus,
    healthStatus: this.fieldHealthStatus,
    irrigationStatus: this.fieldIrrigationStatus,
    farm: this.selectedFarm?._id,
    notes: this.fieldNotes,
    polygonCoordinates: this.fieldBoundaryCoordinates
  };

}

private resetFieldForm() {

  this.editingFieldId = '';
  this.fieldName = '';
  this.fieldCropType = '';
  this.selectedCrop = '';
  this.fieldArea = 0;
  this.fieldStatus = 'Active';
  this.fieldHealthStatus = 'Good';
  this.fieldIrrigationStatus = 'Scheduled';
  this.fieldNotes = '';
  this.fieldBoundaryCoordinates = [];
  this.isDrawingFieldBoundary = false;

}

}
