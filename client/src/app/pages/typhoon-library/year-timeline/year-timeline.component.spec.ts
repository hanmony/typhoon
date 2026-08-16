import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YearTimelineComponent } from './year-timeline.component';

describe('YearTimelineComponent', () => {
  let component: YearTimelineComponent;
  let fixture: ComponentFixture<YearTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YearTimelineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(YearTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
