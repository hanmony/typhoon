import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleCompareActionsComponent } from './simple-compare-actions.component';

describe('SimpleCompareActionsComponent', () => {
  let component: SimpleCompareActionsComponent;
  let fixture: ComponentFixture<SimpleCompareActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleCompareActionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleCompareActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
