import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventOverlayComponent } from './event-overlay.component';

describe('EventOverlayComponent', () => {
  let component: EventOverlayComponent;
  let fixture: ComponentFixture<EventOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
