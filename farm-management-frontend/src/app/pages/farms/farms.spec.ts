import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Farms } from './farms';

describe('Farms', () => {
  let component: Farms;
  let fixture: ComponentFixture<Farms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Farms],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Farms);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
