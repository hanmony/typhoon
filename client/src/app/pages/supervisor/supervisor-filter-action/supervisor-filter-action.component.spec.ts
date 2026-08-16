import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisorFilterActionComponent } from './supervisor-filter-action.component';

describe('SupervisorFilterActionComponent', () => {
  let component: SupervisorFilterActionComponent;
  let fixture: ComponentFixture<SupervisorFilterActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisorFilterActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisorFilterActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
