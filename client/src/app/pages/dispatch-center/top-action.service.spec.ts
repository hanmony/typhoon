import { TestBed } from '@angular/core/testing';

import { TopActionService } from './top-action.service';

describe('TopActionService', () => {
  let service: TopActionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TopActionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
