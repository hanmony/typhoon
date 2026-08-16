import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TyphoonCardComponent } from './typhoon-card.component';

describe('TyphoonCardComponent', () => {
  let component: TyphoonCardComponent;
  let fixture: ComponentFixture<TyphoonCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TyphoonCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TyphoonCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
