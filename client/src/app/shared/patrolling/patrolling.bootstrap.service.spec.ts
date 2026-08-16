import { TestBed } from '@angular/core/testing';

import { PatrollingBootstrapService } from './patrolling.bootstrap.service';

describe('PatrollingBootstrapService', () => {
  let service: PatrollingBootstrapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatrollingBootstrapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
