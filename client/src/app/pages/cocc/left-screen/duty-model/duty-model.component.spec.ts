import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DutyModelComponent } from './duty-model.component';

describe('DutyModelComponent', () => {
  let component: DutyModelComponent;
  let fixture: ComponentFixture<DutyModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DutyModelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DutyModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
