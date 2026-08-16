import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationListOverlayComponent } from './notification-list-overlay.component';

describe('NotificationListOverlayComponent', () => {
  let component: NotificationListOverlayComponent;
  let fixture: ComponentFixture<NotificationListOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationListOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationListOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
