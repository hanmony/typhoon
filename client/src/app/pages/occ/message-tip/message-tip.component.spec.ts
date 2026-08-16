import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageTipComponent } from './message-tip.component';

describe('MessageTipComponent', () => {
  let component: MessageTipComponent;
  let fixture: ComponentFixture<MessageTipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageTipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageTipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
