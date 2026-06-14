import { TestBed } from '@angular/core/testing';

import { Mfa } from './mfa';

describe('Mfa', () => {
  let service: Mfa;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mfa);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
