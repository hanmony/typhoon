import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IllustrationModalComponent } from './illustration-modal.component';

describe('IllustrationModalComponent', () => {
  let component: IllustrationModalComponent;
  let fixture: ComponentFixture<IllustrationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IllustrationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IllustrationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
