import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DutyShortageOverlayComponent } from './duty-shortage-overlay.component';

describe('DutyShortageOverlayComponent', () => {
  let component: DutyShortageOverlayComponent;
  let fixture: ComponentFixture<DutyShortageOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutyShortageOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DutyShortageOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
