import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FunctionOverlayComponent } from './function-overlay.component';

describe('FunctionOverlayComponent', () => {
  let component: FunctionOverlayComponent;
  let fixture: ComponentFixture<FunctionOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FunctionOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FunctionOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
