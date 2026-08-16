import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorDocComponent } from './editor.doc.component';

describe('EditorDocComponent', () => {
  let component: EditorDocComponent;
  let fixture: ComponentFixture<EditorDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorDocComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
