import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmergencyRepairComponent } from './emergency-repair.component';

describe('EmergencyRepairComponent', () => {
  let component: EmergencyRepairComponent;
  let fixture: ComponentFixture<EmergencyRepairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyRepairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmergencyRepairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
