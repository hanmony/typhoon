import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationListModalComponent } from './operation-list-modal.component';

describe('OperationListModalComponent', () => {
  let component: OperationListModalComponent;
  let fixture: ComponentFixture<OperationListModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationListModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationListModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
