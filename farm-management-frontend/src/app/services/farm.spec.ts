import { TestBed } from '@angular/core/testing';

import { Farm } from './farm';

describe('Farm', () => {
  let service: Farm;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Farm);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
