import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { GoogleMapsLoader }
from '../../services/google-maps-loader';
import { Farm } from '../../services/farm';
import { Crop } from '../../services/crop';
import { FinancialRecord } from '../../services/financial-record';

declare const google: any;
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  farms: any[] = [];

  totalFarms = 0;
  totalCrops = 0;
  totalRecords = 0;
  totalRevenue = 0;
  totalExpenses = 0;
  netProfit = 0;

  private farmService = inject(Farm);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);
  private mapsLoader = inject(GoogleMapsLoader);
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {

    await this.mapsLoader.load();

    this.loadDashboardData();

  }

  loadDashboardData() {

    this.farmService.getFarms().subscribe({

      next: (data: any) => {

        this.farms = data;

        this.totalFarms = data.length;

        this.renderFarmMap();

        this.cdr.detectChanges();

      }

    });

    this.cropService.getCrops().subscribe({

      next: (data: any) => {

        this.totalCrops = data.length;

        this.cdr.detectChanges();

      }

    });

    this.financialService.getRecords().subscribe({

      next: (data: any) => {

        this.totalRecords = data.length;

        this.totalRevenue = data
          .filter((record: any) => record.type === 'Income')
          .reduce((sum: number, record: any) => sum + record.amount, 0);

        this.totalExpenses = data
          .filter((record: any) => record.type === 'Expense')
          .reduce((sum: number, record: any) => sum + record.amount, 0);

        this.netProfit = this.totalRevenue - this.totalExpenses;

        this.cdr.detectChanges();

      }

    });

    

  }

  renderFarmMap() {

  setTimeout(() => {

    const mapElement =
      document.getElementById('all-farms-map');

    if (!mapElement) {
      return;
    }

    const map = new google.maps.Map(
      mapElement,
      {
        zoom: 5,
        center: {
          lat: 4.5709,
          lng: -74.2973
        }
      }
    );

    const bounds =
      new google.maps.LatLngBounds();

    this.farms.forEach((farm) => {

      if (
        !farm.latitude ||
        !farm.longitude
      ) {
        return;
      }

      const position = {
        lat: farm.latitude,
        lng: farm.longitude
      };

      const marker =
        new google.maps.Marker({
          position,
          map,
          title: farm.name
        });

      const infoWindow =
        new google.maps.InfoWindow({
          content: `
            <h3>${farm.name}</h3>
            <p>${farm.location}</p>
            <p>Size: ${farm.size}</p>
            <p><strong>Owner:</strong> ${farm.owner?.email || 'Unknown'}</p>
          `
        });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      bounds.extend(position);

    });

    if (this.farms.length > 0) {
      map.fitBounds(bounds);
    }

  }, 300);

}

}