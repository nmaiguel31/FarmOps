import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinancialRecords } from './financial-records';

describe('FinancialRecords', () => {
  let component: FinancialRecords;
  let fixture: ComponentFixture<FinancialRecords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialRecords],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialRecords);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
