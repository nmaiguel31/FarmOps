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

  farmName = '';
  farmLocation = '';
  farmSize = 0;
  farmLatitude = 0;
  farmLongitude = 0;
  editingFarmId = '';

  private farmService = inject(Farm);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    console.log('ngOnInit ejecutado');

    this.loadFarms();
  }
  
  ngAfterViewInit(): void {

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

    console.log(
      'Coordinates:',
      this.farmLatitude,
      this.farmLongitude
    );

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

  console.log(farmData);

  this.farmService.createFarm(farmData).subscribe({

    next: () => {

      console.log('Farm created');

      this.farmName = '';
      this.farmLocation = '';
      this.farmSize = 0;
      this.farmLatitude = 0;
      this.farmLongitude = 0;

      this.loadFarms();

    },

    error: (error) => {

      console.error('Error creating farm:', error);

    }

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

      console.log('Farm updated');

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

    error: (error) => {

      console.error(
        'Error updating farm:',
        error
      );

    }

  });

}
  loadFarms() {

    console.log('loadFarms ejecutado');

    this.farmService.getFarms().subscribe({

      next: (data: any) => {

        console.log('DATA RECIBIDA:', data);

        this.farms = [...data];
        this.cdr.detectChanges();

        console.log('FARMS ASIGNADAS:', this.farms);

      },

      error: (error) => {

        console.error('ERROR:', error);

      }

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

        console.log('Farm deleted');

        this.loadFarms();

        setTimeout(() => {
        this.cdr.detectChanges();
        }, 100);

      },

      error: (error) => {

        console.error(
          'Error deleting farm:',
          error
        );

      }

    });

  }
  
}