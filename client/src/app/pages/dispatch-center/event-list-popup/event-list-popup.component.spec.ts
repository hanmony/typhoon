import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListPopupComponent } from './event-list-popup.component';

describe('EventListPopupComponent', () => {
  let component: EventListPopupComponent;
  let fixture: ComponentFixture<EventListPopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListPopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventListPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
