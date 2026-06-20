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

  searchLocation = '';
  searchOwner = '';
  farmName = '';
  farmLocation = '';
  farmSize = 0;
  farmLatitude = 0;
  farmLongitude = 0;
  editingFarmId = '';

  private mapsLoader = inject(GoogleMapsLoader);
  private farmService = inject(Farm);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    this.loadFarms();
  }
  
  async ngAfterViewInit(): Promise<void> {

    await this.mapsLoader.load();

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
        this.renderMaps();
        this.cdr.detectChanges();

      },

      error: (error) => console.error(error)

    });

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

        this.loadFarms();

        setTimeout(() => {
        this.cdr.detectChanges();
        }, 100);

      },

      error: (error) => console.error(error)

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

searchByLocation(location: string) {

  this.searchLocation = location;

  this.filterFarms();

}

searchByOwner(ownerEmail: string) {

  this.searchOwner = ownerEmail;

  this.filterFarms();

}

}
