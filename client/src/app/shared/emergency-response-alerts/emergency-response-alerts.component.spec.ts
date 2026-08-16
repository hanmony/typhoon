import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmergencyResponseAlertsComponent } from './emergency-response-alerts.component';

describe('EmergencyResponseAlertsComponent', () => {
  let component: EmergencyResponseAlertsComponent;
  let fixture: ComponentFixture<EmergencyResponseAlertsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyResponseAlertsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmergencyResponseAlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
