import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Crop } from '../../services/crop';

@Component({
  selector: 'app-crops',
  imports: [CommonModule, FormsModule],
  templateUrl: './crops.html',
  styleUrl: './crops.css',
})
export class Crops implements OnInit {

  crops: any[] = [];
  farms: any[] = [];

  cropName = '';
  cropType = '';
  cropSeason = '';
  selectedFarm = '';
  editingCropId = '';
  cropFormOpen = false;
  
  private cropService = inject(Crop);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    this.loadCrops();
    this.loadFarms();

  }

  loadFarms() {

  this.cropService.getFarms().subscribe({

    next: (data: any) => {

      this.farms = [...data];

      this.cdr.detectChanges();

    },

    error: (error) => {

      console.error(error);

    }

  });

}

  createCrop() {

  const cropData = {

    name: this.cropName,
    type: this.cropType,
    season: this.cropSeason,
    farm: this.selectedFarm

  };

  this.cropService.createCrop(cropData).subscribe({

    next: () => {

      this.cropName = '';
      this.cropType = '';
      this.cropSeason = '';
      this.selectedFarm = '';
      this.cropFormOpen = false;

      this.loadCrops();

       this.cdr.detectChanges();

    },

    error: (error) => {

      console.error(error);

    }

  });

}

  editCrop(crop: any) {

    this.editingCropId = crop._id;

    this.cropName = crop.name;
    this.cropType = crop.type;
    this.cropSeason = crop.season;

    if (crop.farm) {
      this.selectedFarm = crop.farm._id;
    }

    this.cropFormOpen = true;

  }

  loadCrops() {

    this.cropService.getCrops().subscribe({

      next: (data: any) => {

        this.crops = [...data];

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(error);

      }

    });

  }

deleteCrop(id: string) {

  const confirmed = confirm(
    'Are you sure you want to delete this crop?'
  );

  if (!confirmed) {
    return;
  }

  this.cropService.deleteCrop(id).subscribe({

    next: () => {

      this.loadCrops();

      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);

    },

    error: (error) => {

        console.error(error);

    }

  });

}

  updateCrop() {

    const cropData = {

      name: this.cropName,
      type: this.cropType,
      season: this.cropSeason,
      farm: this.selectedFarm

    };

    this.cropService.updateCrop(
      this.editingCropId,
      cropData
    ).subscribe({

      next: () => {

        this.editingCropId = '';

        this.cropName = '';
        this.cropType = '';
        this.cropSeason = '';
        this.selectedFarm = '';
        this.cropFormOpen = false;

        this.loadCrops();

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(error);

      }

    });

  }

  openCreateCrop() {
    this.editingCropId = '';
    this.cropName = '';
    this.cropType = '';
    this.cropSeason = '';
    this.selectedFarm = '';
    this.cropFormOpen = true;
  }

  closeCropForm() {
    this.cropFormOpen = false;
  }

  getCropStatus(crop: any) {
    return crop.farm ? 'Assigned' : 'Unassigned';
  }

  getSeasonClass(season: string) {
    return (season || 'unknown').toLowerCase();
  }

}
