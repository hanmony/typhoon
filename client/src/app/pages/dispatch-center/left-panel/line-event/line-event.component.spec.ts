import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineEventComponent } from './line-event.component';

describe('LineEventComponent', () => {
  let component: LineEventComponent;
  let fixture: ComponentFixture<LineEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineEventComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
