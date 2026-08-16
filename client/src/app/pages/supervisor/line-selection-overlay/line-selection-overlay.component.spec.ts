import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineSelectionOverlayComponent } from './line-selection-overlay.component';

describe('LineSelectionOverlayComponent', () => {
  let component: LineSelectionOverlayComponent;
  let fixture: ComponentFixture<LineSelectionOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineSelectionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineSelectionOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
