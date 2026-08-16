import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineOperationModuleComponent } from './line-operation-module.component';

describe('LineOperationModuleComponent', () => {
  let component: LineOperationModuleComponent;
  let fixture: ComponentFixture<LineOperationModuleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineOperationModuleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineOperationModuleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
