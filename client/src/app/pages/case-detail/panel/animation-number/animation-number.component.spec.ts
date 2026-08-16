import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimationNumberComponent } from './animation-number.component';

describe('AnimationNumberComponent', () => {
  let component: AnimationNumberComponent;
  let fixture: ComponentFixture<AnimationNumberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationNumberComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnimationNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
