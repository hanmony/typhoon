import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuardRepairComponent } from './guard-repair.component';

describe('GuardRepairComponent', () => {
  let component: GuardRepairComponent;
  let fixture: ComponentFixture<GuardRepairComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardRepairComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuardRepairComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
