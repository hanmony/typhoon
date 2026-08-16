import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareTimelineComponent } from './compare-timeline.component';

describe('CompareTimelineComponent', () => {
  let component: CompareTimelineComponent;
  let fixture: ComponentFixture<CompareTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareTimelineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompareTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
