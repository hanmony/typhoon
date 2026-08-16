import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DigitalPreplanComponent } from './digital-preplan.component';

describe('DigitalPreplanComponent', () => {
  let component: DigitalPreplanComponent;
  let fixture: ComponentFixture<DigitalPreplanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DigitalPreplanComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DigitalPreplanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
