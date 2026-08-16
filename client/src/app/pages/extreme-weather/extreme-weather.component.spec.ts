import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtremeWeatherComponent } from './extreme-weather.component';

describe('ExtremeWeatherComponent', () => {
  let component: ExtremeWeatherComponent;
  let fixture: ComponentFixture<ExtremeWeatherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtremeWeatherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtremeWeatherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
