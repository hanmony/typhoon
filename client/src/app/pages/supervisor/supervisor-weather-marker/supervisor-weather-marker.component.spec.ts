import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisorWeatherMarkerComponent } from './supervisor-weather-marker.component';

describe('SupervisorWeatherMarkerComponent', () => {
  let component: SupervisorWeatherMarkerComponent;
  let fixture: ComponentFixture<SupervisorWeatherMarkerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisorWeatherMarkerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisorWeatherMarkerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
