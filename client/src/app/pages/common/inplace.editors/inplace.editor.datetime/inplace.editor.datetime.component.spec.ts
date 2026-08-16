import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InplaceEditorDatetimeComponent } from './inplace.editor.datetime.component';

describe('InplaceEditorDatetimeComponent', () => {
  let component: InplaceEditorDatetimeComponent;
  let fixture: ComponentFixture<InplaceEditorDatetimeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InplaceEditorDatetimeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InplaceEditorDatetimeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
