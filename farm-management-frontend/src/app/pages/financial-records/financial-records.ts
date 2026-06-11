import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinancialRecord } from '../../services/financial-record';
import jsPDF from 'jspdf';

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

exportCSV() {

  const headers = [
    'Type',
    'Category',
    'Amount',
    'Description',
    'Farm'
  ];

  const rows = this.records.map(record => [

    record.type,

    record.category,

    record.amount,

    record.description || '',

    record.farm?.name || ''

  ]);

  const csvContent =
    [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

  const blob = new Blob(
    [csvContent],
    {
      type: 'text/csv;charset=utf-8;'
    }
  );

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download = 'financial-records.csv';

  link.click();

  window.URL.revokeObjectURL(url);

}

exportPDF() {

  const doc = new jsPDF();

  let revenue = 0;
  let expenses = 0;

  this.records.forEach(record => {

    if (record.type === 'Income') {
      revenue += record.amount;
    }

    if (record.type === 'Expense') {
      expenses += record.amount;
    }

  });

  const profit = revenue - expenses;

  doc.setFontSize(18);

  doc.text(
    'FarmOps Financial Report',
    20,
    20
  );

  doc.setFontSize(12);

  doc.text(
    `Total Records: ${this.records.length}`,
    20,
    40
  );

  doc.text(
    `Total Revenue: $${revenue}`,
    20,
    50
  );

  doc.text(
    `Total Expenses: $${expenses}`,
    20,
    60
  );

  doc.text(
    `Net Profit: $${profit}`,
    20,
    70
  );

  let yPosition = 90;

  doc.text(
    'Financial Records:',
    20,
    yPosition
  );

  yPosition += 10;

  this.records.forEach(record => {

    const line =

      `${record.type} | ` +
      `${record.category} | ` +
      `$${record.amount} | ` +
      `${record.farm?.name || 'N/A'}`;

    doc.text(
      line,
      20,
      yPosition
    );

    yPosition += 10;

    if (yPosition > 270) {

      doc.addPage();

      yPosition = 20;

    }

  });

  doc.save(
    'FarmOps-Financial-Report.pdf'
  );

}

}