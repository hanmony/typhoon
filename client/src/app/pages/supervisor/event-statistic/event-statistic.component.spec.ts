import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventStatisticComponent } from './event-statistic.component';

describe('EventStatisticComponent', () => {
  let component: EventStatisticComponent;
  let fixture: ComponentFixture<EventStatisticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventStatisticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventStatisticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
