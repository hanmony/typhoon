import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionOverlayComponent } from './action-overlay.component';

describe('ActionOverlayComponent', () => {
  let component: ActionOverlayComponent;
  let fixture: ComponentFixture<ActionOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
