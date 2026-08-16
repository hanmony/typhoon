import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InplaceEditorOptionComponent } from './inplace.editor.option.component';

describe('InplaceEditorOptionComponent', () => {
  let component: InplaceEditorOptionComponent;
  let fixture: ComponentFixture<InplaceEditorOptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InplaceEditorOptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InplaceEditorOptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
