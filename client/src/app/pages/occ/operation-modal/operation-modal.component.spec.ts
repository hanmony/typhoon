import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationModalComponent } from './operation-modal.component';

describe('OperationModalComponent', () => {
  let component: OperationModalComponent;
  let fixture: ComponentFixture<OperationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
