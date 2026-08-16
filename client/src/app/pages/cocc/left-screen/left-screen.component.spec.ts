import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftScreenComponent } from './left-screen.component';

describe('LeftScreenComponent', () => {
  let component: LeftScreenComponent;
  let fixture: ComponentFixture<LeftScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeftScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeftScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
