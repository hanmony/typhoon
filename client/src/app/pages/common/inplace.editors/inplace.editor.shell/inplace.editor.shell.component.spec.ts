import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InplaceEditorShellComponent } from './inplace.editor.shell.component';

describe('InplaceEditorShellComponent', () => {
  let component: InplaceEditorShellComponent;
  let fixture: ComponentFixture<InplaceEditorShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InplaceEditorShellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InplaceEditorShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
