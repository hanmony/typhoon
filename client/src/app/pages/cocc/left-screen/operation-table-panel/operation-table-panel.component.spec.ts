import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTablePanelComponent } from './operation-table-panel.component';

describe('OperationTablePanelComponent', () => {
  let component: OperationTablePanelComponent;
  let fixture: ComponentFixture<OperationTablePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationTablePanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationTablePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
