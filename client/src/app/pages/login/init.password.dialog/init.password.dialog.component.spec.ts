import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitPasswordDialogComponent } from './init.password.dialog.component';

describe('InitPasswordDialogComponent', () => {
  let component: InitPasswordDialogComponent;
  let fixture: ComponentFixture<InitPasswordDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InitPasswordDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InitPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
