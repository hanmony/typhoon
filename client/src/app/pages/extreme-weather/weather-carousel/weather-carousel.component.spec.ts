import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherCarouselComponent } from './weather-carousel.component';

describe('WeatherCarouselComponent', () => {
  let component: WeatherCarouselComponent;
  let fixture: ComponentFixture<WeatherCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
