import { TestBed } from '@angular/core/testing';

import { HitsterApi } from './hitster-api';

describe('HitsterApi', () => {
  let service: HitsterApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HitsterApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
