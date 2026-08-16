import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonEventDetailContentComponent } from './common-event-detail-content.component';

describe('CommonEventDetailContentComponent', () => {
  let component: CommonEventDetailContentComponent;
  let fixture: ComponentFixture<CommonEventDetailContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonEventDetailContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommonEventDetailContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
