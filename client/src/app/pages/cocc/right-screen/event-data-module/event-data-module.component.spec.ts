import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventDataModuleComponent } from './event-data-module.component';

describe('EventDataModuleComponent', () => {
  let component: EventDataModuleComponent;
  let fixture: ComponentFixture<EventDataModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventDataModuleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventDataModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
