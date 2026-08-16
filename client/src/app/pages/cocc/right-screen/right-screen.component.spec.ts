import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightScreenComponent } from './right-screen.component';

describe('RightScreenComponent', () => {
  let component: RightScreenComponent;
  let fixture: ComponentFixture<RightScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
