import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Farms } from './farms';

describe('Farms', () => {
  let component: Farms;
  let fixture: ComponentFixture<Farms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Farms],
    }).compileComponents();

    fixture = TestBed.createComponent(Farms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
