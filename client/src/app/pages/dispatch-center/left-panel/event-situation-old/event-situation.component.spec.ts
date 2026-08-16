import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventSituationComponent } from './event-situation.component';

describe('EventSituationComponent', () => {
  let component: EventSituationComponent;
  let fixture: ComponentFixture<EventSituationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventSituationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventSituationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
