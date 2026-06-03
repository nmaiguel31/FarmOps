import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialRecord } from '../../services/financial-record';

@Component({
  selector: 'app-financial-records',
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-records.html',
  styleUrl: './financial-records.css',
})
export class FinancialRecords implements OnInit {

  records: any[] = [];
  farms: any[] = [];

  recordType = '';
  recordCategory = '';
  recordAmount = 0;
  recordDescription = '';
  selectedFarm = '';
  editingRecordId = '';

  private financialService = inject(FinancialRecord);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {

    console.log('Financial Records component loaded');

    this.loadRecords();
    this.loadFarms();
  }

  loadFarms() {

    this.financialService.getFarms().subscribe({

      next: (data: any) => {

        this.farms = [...data];

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(error);

      }

    });

}

  createRecord() {

    const recordData = {

      type: this.recordType,
      category: this.recordCategory,
      amount: this.recordAmount,
      description: this.recordDescription,
      farm: this.selectedFarm

    };

    this.financialService.createRecord(recordData).subscribe({

      next: () => {

        console.log('Record created');

        this.recordType = '';
        this.recordCategory = '';
        this.recordAmount = 0;
        this.recordDescription = '';
        this.selectedFarm = '';

        this.loadRecords();

        this.cdr.detectChanges();


      },

      error: (error) => {

        console.error('Error creating record:', error);

      }

    });

}

  editRecord(record: any) {

    this.editingRecordId = record._id;

    this.recordType = record.type;
    this.recordCategory = record.category;
    this.recordAmount = record.amount;
    this.recordDescription = record.description;

    if (record.farm) {
      this.selectedFarm = record.farm._id;
    }

  }

    updateRecord() {

      const recordData = {

        type: this.recordType,
        category: this.recordCategory,
        amount: this.recordAmount,
        description: this.recordDescription,
        farm: this.selectedFarm

      };

      this.financialService.updateRecord(
        this.editingRecordId,
        recordData
      ).subscribe({

        next: () => {

          console.log('Financial record updated');

          this.editingRecordId = '';

          this.recordType = '';
          this.recordCategory = '';
          this.recordAmount = 0;
          this.recordDescription = '';
          this.selectedFarm = '';

          this.loadRecords();

          setTimeout(() => {
            this.cdr.detectChanges();
          }, 100);

        },

        error: (error) => {

          console.error(
            'Error updating record:',
            error
          );

        }

      });
  }

  loadRecords() {

    this.financialService.getRecords().subscribe({

      next: (data: any) => {

        console.log('RECORDS RECIBIDOS:', data);

        this.records = [...data];

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error('ERROR LOADING RECORDS:', error);

      }

    });

  }

deleteRecord(id: string) {

  const confirmed = confirm(
    'Are you sure you want to delete this financial record?'
  );

  if (!confirmed) {
    return;
  }

  this.financialService.deleteRecord(id).subscribe({

    next: () => {

      console.log('Financial record deleted');

      this.loadRecords();

      setTimeout(() => {
        this.cdr.detectChanges();
      }, 100);

    },

    error: (error) => {

      console.error(
        'Error deleting record:',
        error
      );

    }

  });

}

}