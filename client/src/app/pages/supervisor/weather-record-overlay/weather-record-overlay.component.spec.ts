import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherRecordOverlayComponent } from './weather-record-overlay.component';

describe('WeatherRecordOverlayComponent', () => {
  let component: WeatherRecordOverlayComponent;
  let fixture: ComponentFixture<WeatherRecordOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherRecordOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherRecordOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
