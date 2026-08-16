import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimulatedPatrollingComponent } from './simulated-patrolling.component';

describe('SimulatedPatrollingComponent', () => {
  let component: SimulatedPatrollingComponent;
  let fixture: ComponentFixture<SimulatedPatrollingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimulatedPatrollingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimulatedPatrollingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
