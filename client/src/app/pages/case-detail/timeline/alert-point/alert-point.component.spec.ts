import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertPointComponent } from './alert-point.component';

describe('AlertPointComponent', () => {
  let component: AlertPointComponent;
  let fixture: ComponentFixture<AlertPointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertPointComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertPointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
