import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InplaceEditorStringComponent } from './inplace.editor.string.component';

describe('InplaceEditorStringComponent', () => {
  let component: InplaceEditorStringComponent;
  let fixture: ComponentFixture<InplaceEditorStringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InplaceEditorStringComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InplaceEditorStringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
