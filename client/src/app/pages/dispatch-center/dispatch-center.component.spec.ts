import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchCenterComponent } from './dispatch-center.component';

describe('DispatchCenterComponent', () => {
  let component: DispatchCenterComponent;
  let fixture: ComponentFixture<DispatchCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DispatchCenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispatchCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
