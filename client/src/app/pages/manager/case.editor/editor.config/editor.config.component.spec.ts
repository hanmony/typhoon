import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorConfigComponent } from './editor.config.component';

describe('EditorConfigComponent', () => {
  let component: EditorConfigComponent;
  let fixture: ComponentFixture<EditorConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorConfigComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
