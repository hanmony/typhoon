import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationTextComponent } from './evaluation-text.component';

describe('EvaluationTextComponent', () => {
  let component: EvaluationTextComponent;
  let fixture: ComponentFixture<EvaluationTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
