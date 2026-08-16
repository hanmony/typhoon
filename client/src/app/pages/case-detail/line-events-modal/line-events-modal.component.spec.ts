import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineEventsModalComponent } from './line-events-modal.component';

describe('LineEventsModalComponent', () => {
  let component: LineEventsModalComponent;
  let fixture: ComponentFixture<LineEventsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineEventsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LineEventsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
