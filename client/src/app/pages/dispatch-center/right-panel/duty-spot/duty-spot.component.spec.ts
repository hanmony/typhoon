import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DutySpotComponent } from './duty-spot.component';

describe('DutySpotComponent', () => {
  let component: DutySpotComponent;
  let fixture: ComponentFixture<DutySpotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutySpotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DutySpotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
