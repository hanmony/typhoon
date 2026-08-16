import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatrollingOverlayComponent } from './patrolling-overlay.component';

describe('PatrollingOverlayComponent', () => {
  let component: PatrollingOverlayComponent;
  let fixture: ComponentFixture<PatrollingOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatrollingOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatrollingOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
