import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InplaceEditorNumComponent } from './inplace.editor.num.component';

describe('InplaceEditorNumComponent', () => {
  let component: InplaceEditorNumComponent;
  let fixture: ComponentFixture<InplaceEditorNumComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InplaceEditorNumComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InplaceEditorNumComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
