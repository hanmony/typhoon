import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstructionTableComponent } from './instruction-table.component';

describe('InstructionTableComponent', () => {
  let component: InstructionTableComponent;
  let fixture: ComponentFixture<InstructionTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstructionTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstructionTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
