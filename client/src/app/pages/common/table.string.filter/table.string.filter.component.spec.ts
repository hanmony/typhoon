import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableStringFilterComponent } from './table.string.filter.component';

describe('TableStringFilterComponent', () => {
  let component: TableStringFilterComponent;
  let fixture: ComponentFixture<TableStringFilterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TableStringFilterComponent]
    });
    fixture = TestBed.createComponent(TableStringFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
