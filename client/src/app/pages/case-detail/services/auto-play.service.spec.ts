import { TestBed } from '@angular/core/testing';

import { AutoPlayService } from './auto-play.service';

describe('AutoPlayService', () => {
  let service: AutoPlayService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoPlayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
