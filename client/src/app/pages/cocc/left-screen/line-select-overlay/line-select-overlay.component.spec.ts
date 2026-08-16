import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineSelectOverlayComponent } from './line-select-overlay.component';

describe('LineSelectOverlayComponent', () => {
  let component: LineSelectOverlayComponent;
  let fixture: ComponentFixture<LineSelectOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineSelectOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineSelectOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
