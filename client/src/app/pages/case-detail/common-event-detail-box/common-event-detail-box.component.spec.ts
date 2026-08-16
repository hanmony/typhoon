import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonEventDetailBoxComponent } from './common-event-detail-box.component';

describe('CommonEventDetailBoxComponent', () => {
  let component: CommonEventDetailBoxComponent;
  let fixture: ComponentFixture<CommonEventDetailBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonEventDetailBoxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommonEventDetailBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
