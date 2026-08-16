import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineStatisticOverlayComponent } from './line-statistic-overlay.component';

describe('LineStatisticOverlayComponent', () => {
  let component: LineStatisticOverlayComponent;
  let fixture: ComponentFixture<LineStatisticOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineStatisticOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineStatisticOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
