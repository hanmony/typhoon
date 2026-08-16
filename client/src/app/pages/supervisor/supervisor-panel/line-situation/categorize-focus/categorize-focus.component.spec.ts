import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategorizeFocusComponent } from './categorize-focus.component';

describe('CategorizeFocusComponent', () => {
  let component: CategorizeFocusComponent;
  let fixture: ComponentFixture<CategorizeFocusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorizeFocusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategorizeFocusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
