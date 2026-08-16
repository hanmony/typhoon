import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTableComponent } from './operation-table.component';

describe('OperationTableComponent', () => {
  let component: OperationTableComponent;
  let fixture: ComponentFixture<OperationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
