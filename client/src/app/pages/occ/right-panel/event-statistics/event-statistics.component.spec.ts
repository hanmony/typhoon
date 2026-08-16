import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventStatisticsComponent } from './event-statistics.component';

describe('EventStatisticsComponent', () => {
  let component: EventStatisticsComponent;
  let fixture: ComponentFixture<EventStatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventStatisticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventStatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
