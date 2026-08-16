import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineOpModuleComponent } from './line-op-module.component';

describe('LineOpModuleComponent', () => {
  let component: LineOpModuleComponent;
  let fixture: ComponentFixture<LineOpModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineOpModuleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineOpModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
