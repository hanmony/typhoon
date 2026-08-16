import { TestBed } from '@angular/core/testing';

import { PatrollingDiagramService } from './patrolling.diagram.service';

describe('PatrollingDiagramService', () => {
  let service: PatrollingDiagramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatrollingDiagramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
