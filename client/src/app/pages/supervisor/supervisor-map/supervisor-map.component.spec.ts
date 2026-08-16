import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupervisorMapComponent } from './supervisor-map.component';

describe('SupervisorMapComponent', () => {
  let component: SupervisorMapComponent;
  let fixture: ComponentFixture<SupervisorMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupervisorMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupervisorMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
