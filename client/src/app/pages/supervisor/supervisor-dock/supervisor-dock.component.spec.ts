import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisorDockComponent } from './supervisor-dock.component';

describe('SupervisorDockComponent', () => {
  let component: SupervisorDockComponent;
  let fixture: ComponentFixture<SupervisorDockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisorDockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisorDockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
