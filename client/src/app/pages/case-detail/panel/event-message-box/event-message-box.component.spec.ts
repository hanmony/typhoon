import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMessageBoxComponent } from './event-message-box.component';

describe('EventMessageBoxComponent', () => {
  let component: EventMessageBoxComponent;
  let fixture: ComponentFixture<EventMessageBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventMessageBoxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventMessageBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
