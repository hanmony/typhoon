import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorPathInfoComponent } from './editor.path.info.component';

describe('EditorPathInfoComponent', () => {
  let component: EditorPathInfoComponent;
  let fixture: ComponentFixture<EditorPathInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorPathInfoComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorPathInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
