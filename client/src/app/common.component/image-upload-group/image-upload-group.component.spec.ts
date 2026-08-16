import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageUploadGroupComponent } from './image-upload-group.component';

describe('ImageUploadGroupComponent', () => {
  let component: ImageUploadGroupComponent;
  let fixture: ComponentFixture<ImageUploadGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageUploadGroupComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploadGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
