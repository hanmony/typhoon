import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonEventModalComponent } from './common-event-modal.component';

describe('CommonEventModalComponent', () => {
  let component: CommonEventModalComponent;
  let fixture: ComponentFixture<CommonEventModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonEventModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommonEventModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
