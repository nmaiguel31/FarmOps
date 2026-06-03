import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Crops } from './crops';

describe('Crops', () => {
  let component: Crops;
  let fixture: ComponentFixture<Crops>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Crops],
    }).compileComponents();

    fixture = TestBed.createComponent(Crops);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
