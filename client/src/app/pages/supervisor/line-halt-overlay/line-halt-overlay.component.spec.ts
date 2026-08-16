import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineHaltOverlayComponent } from './line-halt-overlay.component';

describe('LineHaltOverlayComponent', () => {
  let component: LineHaltOverlayComponent;
  let fixture: ComponentFixture<LineHaltOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineHaltOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineHaltOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
