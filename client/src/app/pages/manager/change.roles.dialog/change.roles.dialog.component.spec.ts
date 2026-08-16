import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeRolesDialogComponent } from './change.roles.dialog.component';

describe('ChangeRolesDialogComponent', () => {
  let component: ChangeRolesDialogComponent;
  let fixture: ComponentFixture<ChangeRolesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeRolesDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeRolesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
