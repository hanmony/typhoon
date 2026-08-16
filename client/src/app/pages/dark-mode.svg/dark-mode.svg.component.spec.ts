import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DarkModeSvgComponent } from './dark-mode.svg.component';

describe('DarkModeSvgComponent', () => {
  let component: DarkModeSvgComponent;
  let fixture: ComponentFixture<DarkModeSvgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DarkModeSvgComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DarkModeSvgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
