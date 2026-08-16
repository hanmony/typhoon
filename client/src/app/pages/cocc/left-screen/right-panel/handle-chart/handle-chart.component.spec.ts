import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HandleChartComponent } from './handle-chart.component';

describe('HandleChartComponent', () => {
  let component: HandleChartComponent;
  let fixture: ComponentFixture<HandleChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HandleChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HandleChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
