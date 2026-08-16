import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatrollingDetailComponent } from './patrolling-detail.component';

describe('PatrollingDetailComponent', () => {
  let component: PatrollingDetailComponent;
  let fixture: ComponentFixture<PatrollingDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatrollingDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatrollingDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
