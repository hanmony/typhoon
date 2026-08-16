import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UrgentTeamComponent } from './urgent-team.component';

describe('UrgentTeamComponent', () => {
  let component: UrgentTeamComponent;
  let fixture: ComponentFixture<UrgentTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UrgentTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UrgentTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
