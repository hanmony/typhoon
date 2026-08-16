import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindCircleComponent } from './wind-circle.component';

describe('WindCircleComponent', () => {
  let component: WindCircleComponent;
  let fixture: ComponentFixture<WindCircleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindCircleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WindCircleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
