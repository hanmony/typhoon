import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DualChartComponent } from './dual-chart.component';

describe('DualChartComponent', () => {
  let component: DualChartComponent;
  let fixture: ComponentFixture<DualChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DualChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DualChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
