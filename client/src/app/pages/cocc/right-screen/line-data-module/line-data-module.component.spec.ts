import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineDataModuleComponent } from './line-data-module.component';

describe('LineDataModuleComponent', () => {
  let component: LineDataModuleComponent;
  let fixture: ComponentFixture<LineDataModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineDataModuleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineDataModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
