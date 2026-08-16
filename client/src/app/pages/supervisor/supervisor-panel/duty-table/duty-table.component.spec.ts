import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DutyTableComponent } from './duty-table.component';

describe('DutyTableComponent', () => {
  let component: DutyTableComponent;
  let fixture: ComponentFixture<DutyTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutyTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DutyTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
