import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualLineChartComponent } from './dual-line-chart.component';

describe('DualLineChartComponent', () => {
  let component: DualLineChartComponent;
  let fixture: ComponentFixture<DualLineChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DualLineChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DualLineChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
