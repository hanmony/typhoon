import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationDomComponent } from './notification-dom.component';

describe('NotificationDomComponent', () => {
  let component: NotificationDomComponent;
  let fixture: ComponentFixture<NotificationDomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationDomComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationDomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
