import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginX5Component } from './login-x5.component';

describe('LoginX5Component', () => {
  let component: LoginX5Component;
  let fixture: ComponentFixture<LoginX5Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginX5Component],
    });
    fixture = TestBed.createComponent(LoginX5Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
