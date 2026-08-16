import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventListModalComponent } from './event-list-modal.component';

describe('EventListModalComponent', () => {
  let component: EventListModalComponent;
  let fixture: ComponentFixture<EventListModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventListModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
