import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulatePatrollingComponent } from './simulate-patrolling.component';

describe('SimulatePatrollingComponent', () => {
  let component: SimulatePatrollingComponent;
  let fixture: ComponentFixture<SimulatePatrollingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulatePatrollingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulatePatrollingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
