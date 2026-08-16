import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatisticalTableModalComponent } from './statistical-table-modal.component';

describe('StatisticalTableModalComponent', () => {
  let component: StatisticalTableModalComponent;
  let fixture: ComponentFixture<StatisticalTableModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticalTableModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticalTableModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
