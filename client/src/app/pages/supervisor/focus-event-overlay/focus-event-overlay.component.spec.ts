import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FocusEventOverlayComponent } from './focus-event-overlay.component';

describe('FocusEventOverlayComponent', () => {
  let component: FocusEventOverlayComponent;
  let fixture: ComponentFixture<FocusEventOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FocusEventOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FocusEventOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
