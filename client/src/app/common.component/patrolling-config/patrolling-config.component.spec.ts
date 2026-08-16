import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatrollingConfigComponent } from './patrolling-config.component';

describe('PatrollingConfigComponent', () => {
  let component: PatrollingConfigComponent;
  let fixture: ComponentFixture<PatrollingConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatrollingConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatrollingConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
