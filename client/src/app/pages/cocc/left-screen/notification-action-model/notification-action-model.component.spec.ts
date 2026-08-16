import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationActionModelComponent } from './notification-action-model.component';

describe('NotificationActionModelComponent', () => {
  let component: NotificationActionModelComponent;
  let fixture: ComponentFixture<NotificationActionModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationActionModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationActionModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
