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
  mapsReady = false;

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
    size: this.farmSize
  };

  this.farmService.createFarm(farmData).subscribe({

    next: () => {

      this.farmName = '';
      this.farmLocation = '';
      this.farmSize = 0;
      this.farmLatitude = 0;
      this.farmLongitude = 0;

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
  this.farmFormOpen = true;
}

updateFarm() {

  const farmData = {
    name: this.farmName,
    location: this.farmLocation,
    latitude: this.farmLatitude,
    longitude: this.farmLongitude,
    size: this.farmSize
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
    this.fieldFormOpen = true;

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

  }

  closeFieldForm() {

    this.fieldFormOpen = false;

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
        mapTypeId: 'satellite',
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
  this.farmFormOpen = true;
}

closeFarmForm() {
  this.farmFormOpen = false;
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
    cropType: this.fieldCropType,
    crop: this.selectedCrop || null,
    area: this.fieldArea,
    status: this.fieldStatus,
    healthStatus: this.fieldHealthStatus,
    irrigationStatus: this.fieldIrrigationStatus,
    farm: this.selectedFarm?._id,
    notes: this.fieldNotes,
    polygonCoordinates: []
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

}

}
