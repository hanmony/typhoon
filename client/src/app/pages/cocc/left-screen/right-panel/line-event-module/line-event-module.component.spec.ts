import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineEventModuleComponent } from './line-event-module.component';

describe('LineEventModuleComponent', () => {
  let component: LineEventModuleComponent;
  let fixture: ComponentFixture<LineEventModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineEventModuleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineEventModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
