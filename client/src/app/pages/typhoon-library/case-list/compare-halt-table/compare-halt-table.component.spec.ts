import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompareHaltTableComponent } from './compare-halt-table.component';

describe('CompareHaltTableComponent', () => {
  let component: CompareHaltTableComponent;
  let fixture: ComponentFixture<CompareHaltTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareHaltTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompareHaltTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
