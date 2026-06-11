import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { Farm } from '../../services/farm';
import { Crop } from '../../services/crop';
import { FinancialRecord } from '../../services/financial-record';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  totalFarms = 0;
  totalCrops = 0;
  totalRecords = 0;
  totalRevenue = 0;
totalExpenses = 0;
netProfit = 0;

  private farmService = inject(Farm);
  private cropService = inject(Crop);
  private financialService = inject(FinancialRecord);

  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    this.loadDashboardData();

  }

  loadDashboardData() {

    this.farmService.getFarms().subscribe({

      next: (data: any) => {

        this.totalFarms = data.length;

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

}