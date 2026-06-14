import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mfa } from './mfa';

describe('Mfa', () => {
  let component: Mfa;
  let fixture: ComponentFixture<Mfa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mfa],
    }).compileComponents();

    fixture = TestBed.createComponent(Mfa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
